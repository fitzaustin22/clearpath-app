import { NextResponse } from 'next/server'
import { subscribeToConvertKit } from '@/src/lib/convertkit'

export async function GET() {
  const result = await subscribeToConvertKit(
    'test@clearpathdivorcefinancial.com',
    ['m1-budget-gap-calculator'],
  )
  return NextResponse.json(result)
}
