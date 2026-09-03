import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user.isSuperAdmin ? session : null
}

// Plans are never hard-deleted (companies may already be subscribed) — set
// isActive: false to retire one from the sign-up picker instead.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const plan = await prisma.plan.findUnique({ where: { id } })
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const { name, maxProjects, maxUsers, monthlyPrice, annualPrice, isActive } = await req.json()

  const updated = await prisma.plan.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(maxProjects !== undefined && { maxProjects }),
      ...(maxUsers !== undefined && { maxUsers }),
      ...(monthlyPrice !== undefined && { monthlyPrice }),
      ...(annualPrice !== undefined && { annualPrice }),
      ...(isActive !== undefined && { isActive }),
    },
  })
  return NextResponse.json(updated)
}
