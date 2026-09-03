import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user.isSuperAdmin ? session : null
}

export async function GET() {
  const session = await requireSuperAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plans = await prisma.plan.findMany({
    include: { _count: { select: { subscriptions: true } } },
    orderBy: { monthlyPrice: 'asc' },
  })
  return NextResponse.json(plans)
}

export async function POST(req: NextRequest) {
  const session = await requireSuperAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, maxProjects, maxUsers, monthlyPrice, annualPrice } = await req.json()
  if (!name || maxProjects == null || maxUsers == null || monthlyPrice == null || annualPrice == null) {
    return NextResponse.json({ error: 'name, maxProjects, maxUsers, monthlyPrice, and annualPrice are required' }, { status: 400 })
  }

  const existing = await prisma.plan.findUnique({ where: { name } })
  if (existing) return NextResponse.json({ error: 'A plan with that name already exists' }, { status: 400 })

  const plan = await prisma.plan.create({
    data: { name, maxProjects, maxUsers, monthlyPrice, annualPrice },
  })
  return NextResponse.json(plan, { status: 201 })
}
