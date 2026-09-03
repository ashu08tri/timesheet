import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Public — the sign-up page needs this before anyone is authenticated.
export async function GET() {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { monthlyPrice: 'asc' },
  })
  return NextResponse.json(plans)
}
