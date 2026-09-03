import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Role Master: list all roles defined for the signed-in company.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roles = await prisma.projectRole.findMany({
    where: { companyId: session.user.companyId },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(roles)
}

// Add a new role to the Role Master. Only a Company Admin can do this.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name } = await req.json()
  if (!name || !name.trim())
    return NextResponse.json({ error: 'Role name is required' }, { status: 400 })

  const existing = await prisma.projectRole.findUnique({
    where: { companyId_name: { companyId: session.user.companyId, name } },
  })
  if (existing) return NextResponse.json({ error: 'A role with that name already exists' }, { status: 400 })

  const role = await prisma.projectRole.create({
    data: { companyId: session.user.companyId, name, isSystem: false },
  })
  return NextResponse.json(role, { status: 201 })
}
