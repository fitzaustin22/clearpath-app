import { auth, clerkClient } from '@clerk/nextjs/server'
import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { getPlanForPriceId } from '@/src/lib/plans'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const priceId = typeof body?.priceId === 'string' ? body.priceId : ''
    if (!priceId) {
      return NextResponse.json({ error: 'priceId is required' }, { status: 400 })
    }

    // Only prices this app sells. The plan also decides payment versus
    // subscription: the `mode` the browser sends is ignored.
    const plan = getPlanForPriceId(priceId)
    if (!plan) {
      return NextResponse.json({ error: 'Unknown priceId' }, { status: 400 })
    }

    const clerk = await clerkClient()
    const user = await clerk.users.getUser(userId)
    const email = user.emailAddresses[0]?.emailAddress

    let stripeCustomerId = user.publicMetadata?.stripeCustomerId as string | undefined

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { clerkUserId: userId },
      })
      stripeCustomerId = customer.id

      await clerk.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...user.publicMetadata,
          stripeCustomerId,
        },
      })

      console.log(`[checkout] Created Stripe customer ${stripeCustomerId} for user ${userId}`)
    }

    // The webhook finds the buyer through this row, so nobody is sent to pay
    // unless it was saved.
    const { error: upsertError } = await supabaseAdmin.from('users').upsert(
      {
        id: userId,
        email,
        stripe_customer_id: stripeCustomerId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    if (upsertError) {
      console.error(`[checkout] Could not save the users row for ${userId}:`, upsertError.message)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [{ price: plan.priceId, quantity: 1 }],
      mode: plan.mode,
      // Both carry the Clerk user id so the webhook can find the buyer.
      client_reference_id: userId,
      metadata: { clerkUserId: userId },
      ...(plan.mode === 'subscription'
        ? { subscription_data: { metadata: { clerkUserId: userId } } }
        : {}),
      success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/upgrade`,
    })

    console.log(`[checkout] Created session ${session.id} for user ${userId}, price ${plan.priceId}`)

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[checkout] Error creating checkout session:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
