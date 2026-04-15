export type PlanTier = 'essentials' | 'navigator'
export type PlanInterval = 'month' | 'year'
export type UserTier = 'free' | 'essentials' | 'navigator' | 'signature'

export const TIER_LEVEL: Record<UserTier, number> = {
  free: 0,
  essentials: 1,
  navigator: 2,
  signature: 3,
}

export function hasAccess(userTier: UserTier, requiredTier: UserTier): boolean {
  return TIER_LEVEL[userTier] >= TIER_LEVEL[requiredTier]
}

export interface Plan {
  id: string
  name: string
  priceId: string
  tier: PlanTier
  interval: PlanInterval
  mode: 'payment' | 'subscription'
  description: string
  features: string[]
}

export const PLANS: Plan[] = [
  {
    id: 'essentials_monthly',
    name: 'Essentials',
    priceId: process.env.NEXT_PUBLIC_STRIPE_ESSENTIALS_PRICE_ID!,
    tier: 'essentials',
    interval: 'month',
    mode: 'payment',
    description: 'Essential tools to get started on your financial journey.',
    features: [
      'Budget Gap Calculator',
      'Module 1: Permission to Explore',
      'Life Transition Readiness Assessment',
      'Email support',
    ],
  },
  {
    id: 'navigator_monthly',
    name: 'Navigator',
    priceId: process.env.NEXT_PUBLIC_STRIPE_NAVIGATOR_PRICE_ID!,
    tier: 'navigator',
    interval: 'month',
    mode: 'subscription',
    description: 'Full curriculum with AI-powered guidance.',
    features: [
      'Everything in Essentials',
      'Modules 1–6',
      'ClearPath Navigator AI assistant',
      'Advanced calculators & tools',
      'Settlement Offer Evaluator',
      'Priority support',
    ],
  },
]

export function getTierForPriceId(priceId: string): PlanTier | null {
  return PLANS.find((p) => p.priceId === priceId)?.tier ?? null
}
