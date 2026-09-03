import { NextResponse } from 'next/server'
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

  const companies = await prisma.company.findMany({
    include: {
      subscription: { include: { plan: true } },
      _count: { select: { users: true, projects: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(companies)
}
