import { auth, clerkClient } from '@clerk/nextjs/server'
import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/src/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { priceId, mode = 'subscription' } = await request.json()
    console.log('[checkout] RECEIVED BODY:', JSON.stringify({ priceId, mode }))
    if (!priceId) {
      return NextResponse.json({ error: 'priceId is required' }, { status: 400 })
    }
    if (mode !== 'payment' && mode !== 'subscription') {
      return NextResponse.json({ error: 'mode must be payment or subscription' }, { status: 400 })
    }

    const clerk = await clerkClient()
    const user = await clerk.users.getUser(userId)

    let stripeCustomerId = user.publicMetadata?.stripeCustomerId as string | undefined

    if (!stripeCustomerId) {
      const email = user.emailAddresses[0]?.emailAddress
      const customer = await stripe.customers.create({ email })
      stripeCustomerId = customer.id

      await clerk.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...user.publicMetadata,
          stripeCustomerId,
        },
      })

      console.log(`[checkout] Created Stripe customer ${stripeCustomerId} for user ${userId}`)
    }

    const email = user.emailAddresses[0]?.emailAddress
    await supabaseAdmin.from('users').upsert(
      {
        id: userId,
        email,
        stripe_customer_id: stripeCustomerId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode,
      metadata: { clerkUserId: userId },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/upgrade`,
    })

    console.log(`[checkout] Created session ${session.id} for user ${userId}, price ${priceId}`)

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[checkout] Error creating checkout session:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
