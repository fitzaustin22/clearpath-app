import Stripe from 'stripe'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { getTierForPriceId } from '@/src/lib/plans'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log(`[webhook] Received event: ${event.type}`)

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error(`[webhook] Error handling ${event.type}:`, err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const clerkUserId = session.metadata?.clerkUserId
  if (!clerkUserId) {
    console.error('[webhook] checkout.session.completed missing clerkUserId in metadata')
    return
  }

  // Expand line items to get the priceId
  const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['line_items.data.price'],
  })

  const priceId = fullSession.line_items?.data[0]?.price?.id
  if (!priceId) {
    console.error('[webhook] Could not extract priceId from session line items')
    return
  }

  const tier = getTierForPriceId(priceId)
  if (!tier) {
    console.error(`[webhook] Unknown priceId: ${priceId}`)
    return
  }

  const update: Record<string, unknown> = {
    tier,
    updated_at: new Date().toISOString(),
  }

  // For subscription mode, store the subscription ID and mark active
  if (session.subscription) {
    update.stripe_subscription_id = session.subscription as string
    update.subscription_status = 'active'
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update(update)
    .eq('id', clerkUserId)

  if (error) {
    console.error('[webhook] Supabase update failed:', error)
    return
  }

  console.log(`[webhook] Updated user ${clerkUserId} to tier ${tier}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  // Map Stripe status to our enum
  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'cancelled',
    unpaid: 'expired',
    incomplete: 'expired',
    incomplete_expired: 'expired',
    trialing: 'active',
    paused: 'cancelled',
  }

  const status = statusMap[subscription.status] ?? 'expired'

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      subscription_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('[webhook] Supabase subscription update failed:', error)
    return
  }

  console.log(`[webhook] Updated subscription status to ${status} for customer ${customerId}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  // Downgrade to essentials (not free) — they already paid for Essentials
  const { error } = await supabaseAdmin
    .from('users')
    .update({
      tier: 'essentials',
      stripe_subscription_id: null,
      subscription_status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('[webhook] Supabase subscription delete failed:', error)
    return
  }

  console.log(`[webhook] Downgraded customer ${customerId} to essentials (subscription deleted)`)
}
