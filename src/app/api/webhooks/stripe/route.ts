import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { getTierForPriceId, TIER_LEVEL, type UserTier } from '@/src/lib/plans'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Billing rules. Access in this app is decided by public.users.tier alone, so
// everything in this file is about when that column may change.
//
//   1. A purchase can raise a tier. It never lowers one.
//   2. Only the subscription on file for a user can lower their tier, when Stripe
//      reports it unpaid, paused or ended, and never below
//      FALLBACK_TIER_ON_SUBSCRIPTION_END.
//   3. Every event is acted on by asking Stripe for the session or subscription
//      as it is now. Nothing but the id is taken from the event itself.
//   4. If anything fails, the route answers 500 so that Stripe retries. Every
//      handler is safe to run more than once.

// DECISION PENDING (owner): the tier a subscriber falls back to when a Full Access
// subscription ends. 'essentials' is what this route has always done. Do not change
// it to 'free' until Essentials purchases are recorded somewhere: today nothing
// stores them, so 'free' would also take Essentials away from people who bought it.
const FALLBACK_TIER_ON_SUBSCRIPTION_END: UserTier = 'essentials'

type StoredStatus = 'active' | 'past_due' | 'cancelled' | 'expired'

interface SubscriptionOutcome {
  // The value written to users.subscription_status.
  status: StoredStatus
  // grant: raise to the plan's tier. keep: leave the tier alone.
  // revoke: lower to FALLBACK_TIER_ON_SUBSCRIPTION_END.
  access: 'grant' | 'keep' | 'revoke'
  // True once the subscription can never become active again.
  ended: boolean
}

// What each Stripe subscription status means here. null means "record nothing".
// Every status must be listed: a new one in a future Stripe SDK fails the type check.
const SUBSCRIPTION_OUTCOMES: Record<Stripe.Subscription.Status, SubscriptionOutcome | null> = {
  active: { status: 'active', access: 'grant', ended: false },
  trialing: { status: 'active', access: 'grant', ended: false },
  // DECISION PENDING (owner): 'keep' lets a subscriber keep Full Access while Stripe
  // retries a failed renewal, which is what this route has always done. Change it to
  // 'revoke' to cut access at the first failed payment.
  past_due: { status: 'past_due', access: 'keep', ended: false },
  // Stripe has stopped retrying and the invoice is still open.
  unpaid: { status: 'expired', access: 'revoke', ended: false },
  paused: { status: 'cancelled', access: 'revoke', ended: false },
  canceled: { status: 'cancelled', access: 'revoke', ended: true },
  // The first payment was never completed.
  incomplete_expired: { status: 'expired', access: 'revoke', ended: true },
  // The first payment is still in progress.
  incomplete: null,
}

interface UserRow {
  id: string
  tier: UserTier
  stripe_subscription_id: string | null
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook is not configured' }, { status: 500 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  // The signature covers the exact bytes Stripe sent, so read the body as text.
  const body = await request.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('[webhook] Signature verification failed:', messageOf(err))
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await fulfillCheckout(event.data.object.id)
        break
      case 'checkout.session.async_payment_failed':
        console.warn(`[webhook] Payment failed for session ${event.data.object.id}; no access was granted`)
        break
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object.id)
        break
      default:
        console.log(`[webhook] Ignored event type ${event.type}`)
    }
  } catch (err) {
    console.error(`[webhook] Could not process ${event.type} (${event.id}):`, err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// Grants what a Checkout session paid for. Stripe repeats deliveries, so this
// runs more than once for the same session and must end in the same place.
async function fulfillCheckout(sessionId: string) {
  // Ask Stripe for the session as it is now: the payment status and the price
  // decide everything, and the event that got us here may be old.
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items.data.price'],
  })

  // Bank debits and similar methods finish Checkout before the money arrives.
  // Access waits for checkout.session.async_payment_succeeded.
  if (session.payment_status === 'unpaid') {
    console.log(`[webhook] Session ${session.id} is not paid yet; waiting for the payment to clear`)
    return
  }

  const userId = session.client_reference_id ?? session.metadata?.clerkUserId
  if (!userId) {
    // Not a session this app created. A retry cannot fix that, so answer 200.
    console.error(`[webhook] Session ${session.id} names no user; nothing granted`)
    return
  }

  const subscriptionId = idOf(session.subscription)
  if (subscriptionId) {
    // Full Access follows the subscription's own status, read fresh from Stripe,
    // so a late or repeated checkout event can never hand back a subscription
    // that has since ended.
    const user = await findOrCreateUser(userId, session)
    const status = await syncSubscription(subscriptionId, user)
    if (status === 'incomplete') {
      throw new Error(`session ${session.id} is paid but subscription ${subscriptionId} is still incomplete`)
    }
    return
  }

  const priceId = session.line_items?.data[0]?.price?.id
  const purchasedTier = priceId ? getTierForPriceId(priceId) : null
  if (!purchasedTier) {
    console.error(`[webhook] Session ${session.id} has an unknown price (${priceId ?? 'none'}); nothing granted`)
    return
  }

  const user = await findOrCreateUser(userId, session)
  const tier = higherTier(user.tier, purchasedTier)
  const { error } = await supabaseAdmin
    .from('users')
    .update({ tier, updated_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) throw new Error(`users update failed: ${error.message}`)

  console.log(`[webhook] Session ${session.id}: user ${user.id} is on tier ${tier}`)
}

// Brings a user's row into line with a subscription, and reports the status
// Stripe gave for it. `knownUser` is passed when the caller already knows whose
// subscription this is.
async function syncSubscription(subscriptionId: string, knownUser?: UserRow): Promise<Stripe.Subscription.Status> {
  // Events can arrive late or out of order, so act on the subscription as it is
  // now, not as it was when the event was written.
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const { status } = subscription

  const outcome = SUBSCRIPTION_OUTCOMES[status]
  if (!outcome) {
    console.log(`[webhook] Subscription ${subscription.id} is ${status}; nothing to record`)
    return status
  }

  const user = knownUser ?? (await findUserForSubscription(subscription))
  if (!user) {
    // Not a subscription this app sold. A retry cannot fix that, so answer 200.
    console.error(`[webhook] Subscription ${subscription.id} matches no user; nothing updated`)
    return status
  }

  // Only the subscription on file for a user may hold back or take away access.
  // That keeps a late event about an old subscription, or a subscription this app
  // never granted anything for, from disturbing the user's current state.
  if (outcome.access !== 'grant' && user.stripe_subscription_id !== subscription.id) {
    console.log(`[webhook] Subscription ${subscription.id} is ${status} but is not on file for user ${user.id}; ignored`)
    return status
  }

  const changes: Record<string, unknown> = {
    subscription_status: outcome.status,
    stripe_subscription_id: outcome.ended ? null : subscription.id,
    updated_at: new Date().toISOString(),
  }

  if (outcome.access === 'grant') {
    const priceId = subscription.items.data[0]?.price?.id
    const planTier = priceId ? getTierForPriceId(priceId) : null
    if (!planTier) {
      console.error(`[webhook] Subscription ${subscription.id} has an unknown price (${priceId ?? 'none'}); nothing updated`)
      return status
    }
    changes.tier = higherTier(user.tier, planTier)
  } else if (outcome.access === 'revoke') {
    changes.tier = lowerTier(user.tier, FALLBACK_TIER_ON_SUBSCRIPTION_END)
  }

  const { error } = await supabaseAdmin.from('users').update(changes).eq('id', user.id)
  if (error) throw new Error(`users update failed: ${error.message}`)

  console.log(`[webhook] Subscription ${subscription.id} is ${status}: user ${user.id} is ${outcome.status}`)
  return status
}

async function findUser(column: 'id' | 'stripe_customer_id', value: string): Promise<UserRow | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, tier, stripe_subscription_id')
    .eq(column, value)
    .maybeSingle()
  if (error) throw new Error(`users lookup by ${column} failed: ${error.message}`)
  return (data as UserRow | null) ?? null
}

// Subscriptions created by the checkout route carry the Clerk user id. Older
// ones do not, so fall back to the Stripe customer id.
async function findUserForSubscription(subscription: Stripe.Subscription): Promise<UserRow | null> {
  const clerkUserId = subscription.metadata?.clerkUserId
  const byId = clerkUserId ? await findUser('id', clerkUserId) : null
  if (byId) return byId

  const customerId = idOf(subscription.customer)
  return customerId ? findUser('stripe_customer_id', customerId) : null
}

// The checkout route writes the buyer's row before it opens Checkout. If the row
// is missing anyway, an earlier step went wrong; the customer has paid, so create
// it here rather than leave them without access.
async function findOrCreateUser(userId: string, session: Stripe.Checkout.Session): Promise<UserRow> {
  const existing = await findUser('id', userId)
  if (existing) return existing

  const email = session.customer_details?.email
  if (!email) throw new Error(`no users row for ${userId} and no email on session ${session.id}`)

  const { error } = await supabaseAdmin.from('users').insert({
    id: userId,
    email,
    stripe_customer_id: idOf(session.customer),
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(`users insert failed: ${error.message}`)

  console.warn(`[webhook] Created the missing users row for ${userId}`)
  return { id: userId, tier: 'free', stripe_subscription_id: null }
}

// A tier this file does not recognise counts as free.
function levelOf(tier: UserTier): number {
  return TIER_LEVEL[tier] ?? 0
}

// Ties keep the stored tier, so a legacy 'signature' is never rewritten.
function higherTier(stored: UserTier, candidate: UserTier): UserTier {
  return levelOf(candidate) > levelOf(stored) ? candidate : stored
}

function lowerTier(stored: UserTier, candidate: UserTier): UserTier {
  return levelOf(candidate) < levelOf(stored) ? candidate : stored
}

// Stripe sends a related object either as its id or as the object itself.
function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
