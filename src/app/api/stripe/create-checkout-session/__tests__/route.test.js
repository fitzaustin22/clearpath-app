// @vitest-environment node
//
// Tests for the route that opens Stripe Checkout. Stripe, Clerk and the database
// are all replaced, so nothing here leaves the machine.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeSupabase } from '@/src/test/fakeSupabase'
import { POST } from '../route'

const h = vi.hoisted(() => {
  // Read when the route and src/lib/plans.ts are first imported.
  process.env.STRIPE_SECRET_KEY = 'placeholder'
  process.env.NEXT_PUBLIC_STRIPE_ESSENTIALS_PRICE_ID = 'price_essentials'
  process.env.NEXT_PUBLIC_STRIPE_NAVIGATOR_PRICE_ID = 'price_full_access'
  return {
    db: null,
    auth: vi.fn(),
    getUser: vi.fn(),
    updateUserMetadata: vi.fn(),
    createCustomer: vi.fn(),
    createSession: vi.fn(),
  }
})

vi.mock('@/src/lib/supabase/server', () => ({
  supabaseAdmin: { from: (table) => h.db.client.from(table) },
}))

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => h.auth(),
  clerkClient: async () => ({
    users: { getUser: h.getUser, updateUserMetadata: h.updateUserMetadata },
  }),
}))

vi.mock('stripe', () => ({
  default: class {
    constructor() {
      this.customers = { create: h.createCustomer }
      this.checkout = { sessions: { create: h.createSession } }
    }
  },
}))

const ESSENTIALS_PRICE = 'price_essentials'
const FULL_ACCESS_PRICE = 'price_full_access'
const USER = 'user_1'

function post(body) {
  return POST(
    new Request('http://localhost/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  )
}

// The arguments of the one Checkout session the route created.
function createdSession() {
  expect(h.createSession).toHaveBeenCalledTimes(1)
  return h.createSession.mock.calls[0][0]
}

beforeEach(() => {
  h.db = createFakeSupabase([])
  h.auth.mockResolvedValue({ userId: USER })
  h.getUser.mockResolvedValue({
    emailAddresses: [{ emailAddress: 'buyer@example.com' }],
    publicMetadata: { stripeCustomerId: 'cus_existing' },
  })
  h.updateUserMetadata.mockResolvedValue({})
  h.createCustomer.mockResolvedValue({ id: 'cus_new' })
  h.createSession.mockResolvedValue({ id: 'cs_1', url: 'https://checkout.stripe.test/cs_1' })
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

describe('who may start a checkout', () => {
  it('refuses a signed-out request', async () => {
    h.auth.mockResolvedValue({ userId: null })
    const res = await post({ priceId: ESSENTIALS_PRICE, mode: 'payment' })
    expect(res.status).toBe(401)
    expect(h.createSession).not.toHaveBeenCalled()
    expect(h.db.rows()).toHaveLength(0)
  })
})

describe('what may be bought', () => {
  it.each([
    ['no priceId', {}],
    ['an empty priceId', { priceId: '' }],
    ['a priceId that is not text', { priceId: 42 }],
    ['a body that is not JSON', 'not json'],
  ])('answers 400 for %s', async (_label, body) => {
    const res = await post(body)
    expect(res.status).toBe(400)
    expect(h.createSession).not.toHaveBeenCalled()
    expect(h.createCustomer).not.toHaveBeenCalled()
  })

  it('answers 400 for a price this app does not sell, before touching Stripe or the database', async () => {
    const res = await post({ priceId: 'price_something_else', mode: 'payment' })
    expect(res.status).toBe(400)
    expect(h.createSession).not.toHaveBeenCalled()
    expect(h.createCustomer).not.toHaveBeenCalled()
    expect(h.getUser).not.toHaveBeenCalled()
    expect(h.db.rows()).toHaveLength(0)
  })

  it('opens a one-time payment for Essentials', async () => {
    const res = await post({ priceId: ESSENTIALS_PRICE, mode: 'payment' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.test/cs_1' })

    const session = createdSession()
    expect(session).toMatchObject({
      mode: 'payment',
      customer: 'cus_existing',
      line_items: [{ price: ESSENTIALS_PRICE, quantity: 1 }],
      client_reference_id: USER,
      metadata: { clerkUserId: USER },
    })
    expect(session).not.toHaveProperty('subscription_data')
  })

  it('opens a subscription for Full Access and labels the subscription with the user', async () => {
    const res = await post({ priceId: FULL_ACCESS_PRICE, mode: 'subscription' })
    expect(res.status).toBe(200)
    expect(createdSession()).toMatchObject({
      mode: 'subscription',
      line_items: [{ price: FULL_ACCESS_PRICE, quantity: 1 }],
      client_reference_id: USER,
      metadata: { clerkUserId: USER },
      subscription_data: { metadata: { clerkUserId: USER } },
    })
  })

  it.each([
    [FULL_ACCESS_PRICE, 'payment', 'subscription'],
    [ESSENTIALS_PRICE, 'subscription', 'payment'],
    [FULL_ACCESS_PRICE, undefined, 'subscription'],
    [ESSENTIALS_PRICE, undefined, 'payment'],
  ])('takes the mode from the plan, not the request (%s sent as %s becomes %s)', async (priceId, sent, expected) => {
    const res = await post({ priceId, mode: sent })
    expect(res.status).toBe(200)
    expect(createdSession().mode).toBe(expected)
  })
})

describe('the Stripe customer and the users row', () => {
  it('reuses the Stripe customer already linked to the Clerk user', async () => {
    await post({ priceId: ESSENTIALS_PRICE })
    expect(h.createCustomer).not.toHaveBeenCalled()
    expect(h.updateUserMetadata).not.toHaveBeenCalled()
    expect(h.db.row(USER)).toMatchObject({
      id: USER,
      email: 'buyer@example.com',
      stripe_customer_id: 'cus_existing',
      tier: 'free',
    })
  })

  it('creates and links a Stripe customer the first time', async () => {
    h.getUser.mockResolvedValue({
      emailAddresses: [{ emailAddress: 'buyer@example.com' }],
      publicMetadata: {},
    })
    await post({ priceId: ESSENTIALS_PRICE })

    expect(h.createCustomer).toHaveBeenCalledWith({
      email: 'buyer@example.com',
      metadata: { clerkUserId: USER },
    })
    expect(h.updateUserMetadata).toHaveBeenCalledWith(USER, {
      publicMetadata: { stripeCustomerId: 'cus_new' },
    })
    expect(h.db.row(USER).stripe_customer_id).toBe('cus_new')
    expect(createdSession().customer).toBe('cus_new')
  })

  it('leaves the tier of an existing user untouched', async () => {
    h.db = createFakeSupabase([
      { id: USER, email: 'buyer@example.com', tier: 'navigator', stripe_customer_id: 'cus_existing' },
    ])
    await post({ priceId: ESSENTIALS_PRICE })
    expect(h.db.row(USER).tier).toBe('navigator')
  })

  it('does not send anyone to pay when the users row cannot be saved', async () => {
    h.db.failOn('upsert')
    const res = await post({ priceId: FULL_ACCESS_PRICE })
    expect(res.status).toBe(500)
    expect(h.createSession).not.toHaveBeenCalled()
  })

  it('answers 500 when Stripe cannot create the session', async () => {
    h.createSession.mockRejectedValue(new Error('simulated Stripe outage'))
    const res = await post({ priceId: ESSENTIALS_PRICE })
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Internal server error' })
  })
})
