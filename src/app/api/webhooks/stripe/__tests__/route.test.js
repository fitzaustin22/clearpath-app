// @vitest-environment node
//
// Tests for the Stripe webhook. Signatures are checked by the real Stripe library:
// every request below is signed the way Stripe signs it. Only the two calls that
// would reach Stripe's API, and the database, are replaced.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Stripe from 'stripe'
import { createFakeSupabase } from '@/src/test/fakeSupabase'
import { POST } from '../route'

const h = vi.hoisted(() => {
  // Read when the route and src/lib/plans.ts are first imported.
  process.env.STRIPE_SECRET_KEY = 'placeholder'
  process.env.STRIPE_WEBHOOK_SECRET = 'test-signing-secret'
  process.env.NEXT_PUBLIC_STRIPE_ESSENTIALS_PRICE_ID = 'price_essentials'
  process.env.NEXT_PUBLIC_STRIPE_NAVIGATOR_PRICE_ID = 'price_full_access'
  // db: the fake database. sessions / subscriptions: what "Stripe" returns, by id.
  return { db: null, sessions: {}, subscriptions: {}, stripeIsDown: false }
})

vi.mock('@/src/lib/supabase/server', () => ({
  supabaseAdmin: { from: (table) => h.db.client.from(table) },
}))

vi.mock('stripe', async (importOriginal) => {
  const actual = await importOriginal()

  function lookUp(kind, id) {
    if (h.stripeIsDown) throw new Error('simulated Stripe outage')
    const found = h[kind][id]
    if (!found) throw new Error(`No such ${kind}: ${id}`)
    return found
  }

  class StripeWithFakeApi extends actual.default {
    constructor(...args) {
      super(...args)
      this.checkout = { sessions: { retrieve: async (id) => lookUp('sessions', id) } }
      this.subscriptions = { retrieve: async (id) => lookUp('subscriptions', id) }
    }
  }

  return { ...actual, default: StripeWithFakeApi }
})

const SIGNING_SECRET = 'test-signing-secret'
const ESSENTIALS_PRICE = 'price_essentials'
const FULL_ACCESS_PRICE = 'price_full_access'
const USER = 'user_1'
const CUSTOMER = 'cus_1'

function userRow(overrides = {}) {
  return {
    id: USER,
    email: 'buyer@example.com',
    tier: 'free',
    stripe_customer_id: CUSTOMER,
    stripe_subscription_id: null,
    subscription_status: null,
    ...overrides,
  }
}

function checkoutSession(overrides = {}) {
  return {
    id: 'cs_1',
    object: 'checkout.session',
    payment_status: 'paid',
    client_reference_id: USER,
    metadata: { clerkUserId: USER },
    customer: CUSTOMER,
    customer_details: { email: 'buyer@example.com' },
    subscription: null,
    line_items: { data: [{ price: { id: ESSENTIALS_PRICE } }] },
    ...overrides,
  }
}

function fullAccessSession(overrides = {}) {
  return checkoutSession({
    subscription: 'sub_1',
    line_items: { data: [{ price: { id: FULL_ACCESS_PRICE } }] },
    ...overrides,
  })
}

function subscription(overrides = {}) {
  return {
    id: 'sub_1',
    object: 'subscription',
    status: 'active',
    customer: CUSTOMER,
    metadata: { clerkUserId: USER },
    items: { data: [{ price: { id: FULL_ACCESS_PRICE } }] },
    ...overrides,
  }
}

let eventCount = 0

// Sends one signed event to the route, as Stripe would. The event carries only
// the object's id: the route must fetch the rest from Stripe itself.
function deliver(type, objectId, { secret = SIGNING_SECRET, sign = true, tamper = false } = {}) {
  eventCount += 1
  const payload = JSON.stringify({
    id: `evt_${eventCount}`,
    object: 'event',
    type,
    data: { object: { id: objectId } },
  })
  const headers = { 'content-type': 'application/json' }
  if (sign) {
    headers['stripe-signature'] = Stripe.webhooks.generateTestHeaderString({ payload, secret })
  }
  const body = tamper ? payload.replace(objectId, `${objectId}x`) : payload
  return POST(new Request('http://localhost/api/webhooks/stripe', { method: 'POST', headers, body }))
}

beforeEach(() => {
  h.db = createFakeSupabase([userRow()])
  h.sessions = {}
  h.subscriptions = {}
  h.stripeIsDown = false
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('signature', () => {
  it('rejects a request with no signature', async () => {
    h.sessions.cs_1 = checkoutSession()
    const res = await deliver('checkout.session.completed', 'cs_1', { sign: false })
    expect(res.status).toBe(400)
    expect(h.db.row(USER).tier).toBe('free')
  })

  it('rejects a request signed with a different secret', async () => {
    h.sessions.cs_1 = checkoutSession()
    const res = await deliver('checkout.session.completed', 'cs_1', { secret: 'some-other-secret' })
    expect(res.status).toBe(400)
    expect(h.db.row(USER).tier).toBe('free')
  })

  it('rejects a request whose body was changed after signing', async () => {
    h.sessions.cs_1 = checkoutSession()
    h.sessions.cs_1x = checkoutSession({ id: 'cs_1x' })
    const res = await deliver('checkout.session.completed', 'cs_1', { tamper: true })
    expect(res.status).toBe(400)
    expect(h.db.row(USER).tier).toBe('free')
  })

  it('does not write the signed body to the log when verification fails', async () => {
    await deliver('checkout.session.completed', 'cs_1', { secret: 'some-other-secret' })
    const logged = JSON.stringify(console.error.mock.calls)
    expect(logged).not.toContain('cs_1')
  })

  it('answers 500 when the signing secret is not configured', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '')
    h.sessions.cs_1 = checkoutSession()
    const res = await deliver('checkout.session.completed', 'cs_1')
    expect(res.status).toBe(500)
    expect(h.db.row(USER).tier).toBe('free')
  })

  it('accepts a signed event of a type it does not handle', async () => {
    const res = await deliver('invoice.paid', 'in_1')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ received: true })
  })
})

describe('checkout fulfilment', () => {
  it('grants Essentials for a paid Essentials session', async () => {
    h.sessions.cs_1 = checkoutSession()
    const res = await deliver('checkout.session.completed', 'cs_1')
    expect(res.status).toBe(200)
    expect(h.db.row(USER)).toMatchObject({
      tier: 'essentials',
      stripe_customer_id: CUSTOMER,
      stripe_subscription_id: null,
      subscription_status: null,
    })
  })

  it('grants Full Access and records the subscription for a paid subscription session', async () => {
    h.sessions.cs_1 = fullAccessSession()
    h.subscriptions.sub_1 = subscription()
    const res = await deliver('checkout.session.completed', 'cs_1')
    expect(res.status).toBe(200)
    expect(h.db.row(USER)).toMatchObject({
      tier: 'navigator',
      stripe_subscription_id: 'sub_1',
      subscription_status: 'active',
    })
  })

  it('waits for the money: an unpaid session grants nothing until the payment clears', async () => {
    h.sessions.cs_1 = checkoutSession({ payment_status: 'unpaid' })
    const first = await deliver('checkout.session.completed', 'cs_1')
    expect(first.status).toBe(200)
    expect(h.db.row(USER).tier).toBe('free')

    h.sessions.cs_1 = checkoutSession({ payment_status: 'paid' })
    const second = await deliver('checkout.session.async_payment_succeeded', 'cs_1')
    expect(second.status).toBe(200)
    expect(h.db.row(USER).tier).toBe('essentials')
  })

  it('grants a session that needed no payment', async () => {
    h.sessions.cs_1 = checkoutSession({ payment_status: 'no_payment_required' })
    await deliver('checkout.session.completed', 'cs_1')
    expect(h.db.row(USER).tier).toBe('essentials')
  })

  it('grants nothing when a delayed payment fails', async () => {
    h.sessions.cs_1 = checkoutSession({ payment_status: 'unpaid' })
    const res = await deliver('checkout.session.async_payment_failed', 'cs_1')
    expect(res.status).toBe(200)
    expect(h.db.row(USER).tier).toBe('free')
  })

  it('never lowers a tier: an Essentials purchase leaves a Full Access subscriber alone', async () => {
    h.db = createFakeSupabase([
      userRow({ tier: 'navigator', stripe_subscription_id: 'sub_1', subscription_status: 'active' }),
    ])
    h.sessions.cs_1 = checkoutSession()
    const res = await deliver('checkout.session.completed', 'cs_1')
    expect(res.status).toBe(200)
    expect(h.db.row(USER)).toMatchObject({
      tier: 'navigator',
      stripe_subscription_id: 'sub_1',
      subscription_status: 'active',
    })
  })

  it('does not rewrite a legacy signature tier', async () => {
    h.db = createFakeSupabase([userRow({ tier: 'signature' })])
    h.sessions.cs_1 = fullAccessSession()
    h.subscriptions.sub_1 = subscription()
    await deliver('checkout.session.completed', 'cs_1')
    expect(h.db.row(USER).tier).toBe('signature')
  })

  it('gives the same result when Stripe delivers the same session twice', async () => {
    h.sessions.cs_1 = fullAccessSession()
    h.subscriptions.sub_1 = subscription()
    await deliver('checkout.session.completed', 'cs_1')
    const once = h.db.row(USER)
    const res = await deliver('checkout.session.completed', 'cs_1')
    expect(res.status).toBe(200)
    expect({ ...h.db.row(USER), updated_at: null }).toEqual({ ...once, updated_at: null })
    expect(h.db.rows()).toHaveLength(1)
  })

  it('does not hand back a subscription that has since ended when a checkout event arrives late', async () => {
    // The customer subscribed, then cancelled. The original "completed" event is
    // delivered (or re-sent) afterwards. The session still says paid.
    h.db = createFakeSupabase([userRow({ tier: 'essentials', subscription_status: 'cancelled' })])
    h.sessions.cs_1 = fullAccessSession()
    h.subscriptions.sub_1 = subscription({ status: 'canceled' })
    const res = await deliver('checkout.session.completed', 'cs_1')
    expect(res.status).toBe(200)
    expect(h.db.row(USER)).toMatchObject({
      tier: 'essentials',
      stripe_subscription_id: null,
      subscription_status: 'cancelled',
    })
  })

  it('answers 500 so Stripe retries when a paid session has a subscription that is not active yet', async () => {
    h.sessions.cs_1 = fullAccessSession()
    h.subscriptions.sub_1 = subscription({ status: 'incomplete' })
    const res = await deliver('checkout.session.completed', 'cs_1')
    expect(res.status).toBe(500)
    expect(h.db.row(USER)).toMatchObject({ tier: 'free', stripe_subscription_id: null })
  })

  it('finds the user from session metadata when client_reference_id is missing', async () => {
    h.sessions.cs_1 = checkoutSession({ client_reference_id: null })
    await deliver('checkout.session.completed', 'cs_1')
    expect(h.db.row(USER).tier).toBe('essentials')
  })

  it('creates the users row when it is missing, so a paying customer still gets access', async () => {
    h.db = createFakeSupabase([])
    h.sessions.cs_1 = fullAccessSession()
    h.subscriptions.sub_1 = subscription()
    const res = await deliver('checkout.session.completed', 'cs_1')
    expect(res.status).toBe(200)
    expect(h.db.row(USER)).toMatchObject({
      id: USER,
      email: 'buyer@example.com',
      tier: 'navigator',
      stripe_customer_id: CUSTOMER,
      stripe_subscription_id: 'sub_1',
      subscription_status: 'active',
    })
  })

  it('answers 500 when the row is missing and the session has no email to create it with', async () => {
    h.db = createFakeSupabase([])
    h.sessions.cs_1 = checkoutSession({ customer_details: null })
    const res = await deliver('checkout.session.completed', 'cs_1')
    expect(res.status).toBe(500)
    expect(h.db.rows()).toHaveLength(0)
  })

  it.each(['select', 'update'])('answers 500 so Stripe retries when the database %s fails', async (operation) => {
    h.db.failOn(operation)
    h.sessions.cs_1 = checkoutSession()
    const res = await deliver('checkout.session.completed', 'cs_1')
    expect(res.status).toBe(500)
    expect(h.db.row(USER).tier).toBe('free')
  })

  it('does not guess when the database cannot be read: answers 500 and creates nothing', async () => {
    h.db = createFakeSupabase([])
    h.db.failOn('select')
    h.sessions.cs_1 = checkoutSession()
    const res = await deliver('checkout.session.completed', 'cs_1')
    expect(res.status).toBe(500)
    expect(h.db.rows()).toHaveLength(0)
  })

  it('answers 500 so Stripe retries when the missing row cannot be created', async () => {
    h.db = createFakeSupabase([])
    h.db.failOn('insert')
    h.sessions.cs_1 = checkoutSession()
    const res = await deliver('checkout.session.completed', 'cs_1')
    expect(res.status).toBe(500)
  })

  it('answers 500 so Stripe retries when Stripe cannot be reached', async () => {
    h.stripeIsDown = true
    h.sessions.cs_1 = checkoutSession()
    const res = await deliver('checkout.session.completed', 'cs_1')
    expect(res.status).toBe(500)
    expect(h.db.row(USER).tier).toBe('free')
  })

  it('answers 200 and grants nothing for a session that names no user', async () => {
    h.sessions.cs_1 = checkoutSession({ client_reference_id: null, metadata: {} })
    const res = await deliver('checkout.session.completed', 'cs_1')
    expect(res.status).toBe(200)
    expect(h.db.row(USER).tier).toBe('free')
  })

  it('answers 200 and grants nothing for a price this app does not sell', async () => {
    h.sessions.cs_1 = checkoutSession({ line_items: { data: [{ price: { id: 'price_something_else' } }] } })
    const res = await deliver('checkout.session.completed', 'cs_1')
    expect(res.status).toBe(200)
    expect(h.db.row(USER).tier).toBe('free')
  })
})

describe('subscription changes', () => {
  const subscriber = () =>
    userRow({ tier: 'navigator', stripe_subscription_id: 'sub_1', subscription_status: 'active' })

  // Each row: Stripe's status, then the tier, stored status and subscription id
  // the user should end up with. Starting point: a Full Access subscriber.
  //
  // Two rows record decisions the owner has not made yet. They pin today's
  // behaviour so that changing it is a deliberate edit, here and in the route:
  //   past_due  -> access is kept while Stripe retries the payment
  //   canceled  -> the subscriber falls back to Essentials, not Free
  it.each([
    ['active', 'navigator', 'active', 'sub_1'],
    ['trialing', 'navigator', 'active', 'sub_1'],
    ['past_due', 'navigator', 'past_due', 'sub_1'],
    ['unpaid', 'essentials', 'expired', 'sub_1'],
    ['paused', 'essentials', 'cancelled', 'sub_1'],
    ['canceled', 'essentials', 'cancelled', null],
    ['incomplete_expired', 'essentials', 'expired', null],
    ['incomplete', 'navigator', 'active', 'sub_1'],
  ])('when Stripe reports %s: tier %s, status %s, subscription on file %s', async (status, tier, stored, subscriptionId) => {
    h.db = createFakeSupabase([subscriber()])
    h.subscriptions.sub_1 = subscription({ status })
    const res = await deliver('customer.subscription.updated', 'sub_1')
    expect(res.status).toBe(200)
    expect(h.db.row(USER)).toMatchObject({
      tier,
      subscription_status: stored,
      stripe_subscription_id: subscriptionId,
    })
  })

  it('acts on the subscription as it is now, not on the event that arrived', async () => {
    // A "deleted" event for a subscription Stripe now reports as active again
    // (for example a late delivery) must not take access away.
    h.db = createFakeSupabase([subscriber()])
    h.subscriptions.sub_1 = subscription({ status: 'active' })
    await deliver('customer.subscription.deleted', 'sub_1')
    expect(h.db.row(USER).tier).toBe('navigator')

    // And an "updated" event for a subscription that has since been cancelled
    // must not leave access in place.
    h.subscriptions.sub_1 = subscription({ status: 'canceled' })
    await deliver('customer.subscription.updated', 'sub_1')
    expect(h.db.row(USER)).toMatchObject({ tier: 'essentials', stripe_subscription_id: null })
  })

  it('restores Full Access when an unpaid subscription is paid', async () => {
    h.db = createFakeSupabase([subscriber()])
    h.subscriptions.sub_1 = subscription({ status: 'unpaid' })
    await deliver('customer.subscription.updated', 'sub_1')
    expect(h.db.row(USER).tier).toBe('essentials')

    h.subscriptions.sub_1 = subscription({ status: 'active' })
    await deliver('customer.subscription.updated', 'sub_1')
    expect(h.db.row(USER)).toMatchObject({ tier: 'navigator', subscription_status: 'active' })
  })

  it('grants Full Access from an active subscription even if the checkout event never arrived', async () => {
    h.subscriptions.sub_1 = subscription()
    const res = await deliver('customer.subscription.updated', 'sub_1')
    expect(res.status).toBe(200)
    expect(h.db.row(USER)).toMatchObject({
      tier: 'navigator',
      stripe_subscription_id: 'sub_1',
      subscription_status: 'active',
    })
  })

  it('does not rewrite a legacy signature tier', async () => {
    h.db = createFakeSupabase([userRow({ tier: 'signature' })])
    h.subscriptions.sub_1 = subscription()
    await deliver('customer.subscription.updated', 'sub_1')
    expect(h.db.row(USER).tier).toBe('signature')
  })

  it('finds the user by the user id on the subscription, even when the customer on file differs', async () => {
    h.db = createFakeSupabase([userRow({ stripe_customer_id: 'cus_earlier' })])
    h.subscriptions.sub_1 = subscription()
    await deliver('customer.subscription.updated', 'sub_1')
    expect(h.db.row(USER)).toMatchObject({ tier: 'navigator', stripe_subscription_id: 'sub_1' })
  })

  it('finds the user by Stripe customer for subscriptions created before the user id was attached', async () => {
    h.db = createFakeSupabase([subscriber()])
    h.subscriptions.sub_1 = subscription({ status: 'canceled', metadata: {} })
    await deliver('customer.subscription.deleted', 'sub_1')
    expect(h.db.row(USER)).toMatchObject({ tier: 'essentials', subscription_status: 'cancelled' })
  })

  it('ignores the end of an old subscription when a newer one is on file', async () => {
    h.db = createFakeSupabase([
      userRow({ tier: 'navigator', stripe_subscription_id: 'sub_2', subscription_status: 'active' }),
    ])
    h.subscriptions.sub_1 = subscription({ status: 'canceled' })
    const res = await deliver('customer.subscription.deleted', 'sub_1')
    expect(res.status).toBe(200)
    expect(h.db.row(USER)).toMatchObject({
      tier: 'navigator',
      stripe_subscription_id: 'sub_2',
      subscription_status: 'active',
    })
  })

  it('ignores the end of a subscription that never granted this user anything', async () => {
    // For example a Full Access tier granted by hand, with no subscription on file.
    h.db = createFakeSupabase([userRow({ tier: 'navigator' })])
    h.subscriptions.sub_1 = subscription({ status: 'canceled' })
    const res = await deliver('customer.subscription.deleted', 'sub_1')
    expect(res.status).toBe(200)
    expect(h.db.row(USER)).toMatchObject({ tier: 'navigator', subscription_status: null })
  })

  it('never raises a tier when a subscription ends', async () => {
    h.db = createFakeSupabase([userRow({ tier: 'free', stripe_subscription_id: 'sub_1' })])
    h.subscriptions.sub_1 = subscription({ status: 'canceled' })
    await deliver('customer.subscription.deleted', 'sub_1')
    expect(h.db.row(USER).tier).toBe('free')
  })

  it('answers 200 and changes nothing for a subscription that matches no user', async () => {
    h.subscriptions.sub_9 = subscription({ id: 'sub_9', customer: 'cus_unknown', metadata: {} })
    const res = await deliver('customer.subscription.updated', 'sub_9')
    expect(res.status).toBe(200)
    expect(h.db.row(USER)).toMatchObject({ tier: 'free', stripe_subscription_id: null })
  })

  it('answers 200 and changes nothing for an active subscription to a price this app does not sell', async () => {
    h.subscriptions.sub_1 = subscription({ items: { data: [{ price: { id: 'price_something_else' } }] } })
    const res = await deliver('customer.subscription.updated', 'sub_1')
    expect(res.status).toBe(200)
    expect(h.db.row(USER)).toMatchObject({ tier: 'free', stripe_subscription_id: null })
  })

  it.each(['select', 'update'])('answers 500 so Stripe retries when the database %s fails', async (operation) => {
    h.db = createFakeSupabase([subscriber()])
    h.db.failOn(operation)
    h.subscriptions.sub_1 = subscription({ status: 'canceled' })
    const res = await deliver('customer.subscription.deleted', 'sub_1')
    expect(res.status).toBe(500)
    expect(h.db.row(USER).tier).toBe('navigator')
  })

  it('answers 500 so Stripe retries when Stripe cannot be reached', async () => {
    h.db = createFakeSupabase([subscriber()])
    h.stripeIsDown = true
    const res = await deliver('customer.subscription.deleted', 'sub_1')
    expect(res.status).toBe(500)
    expect(h.db.row(USER).tier).toBe('navigator')
  })
})
