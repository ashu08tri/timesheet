import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addMonths, addYears } from 'date-fns'

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user.isSuperAdmin ? session : null
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const company = await prisma.company.findUnique({ where: { id }, include: { subscription: true } })
  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  const { isActive, planId, billingCycle, subscriptionStatus } = await req.json()

  if (isActive !== undefined) {
    await prisma.company.update({ where: { id }, data: { isActive } })
  }

  if (company.subscription && (planId || billingCycle || subscriptionStatus)) {
    const cycle = billingCycle ?? company.subscription.billingCycle
    const data: Record<string, unknown> = {}
    if (planId) data.planId = planId
    if (billingCycle) data.billingCycle = billingCycle
    if (subscriptionStatus) data.status = subscriptionStatus
    if (planId || billingCycle) {
      data.currentPeriodStart = new Date()
      data.currentPeriodEnd = cycle === 'ANNUAL' ? addYears(new Date(), 1) : addMonths(new Date(), 1)
    }
    await prisma.subscription.update({ where: { companyId: id }, data })
  }

  const updated = await prisma.company.findUnique({
    where: { id },
    include: { subscription: { include: { plan: true } }, _count: { select: { users: true, projects: true } } },
  })
  return NextResponse.json(updated)
}
