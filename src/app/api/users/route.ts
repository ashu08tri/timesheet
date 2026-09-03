import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !['MANAGER','ADMIN'].includes(session.user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const users = await prisma.user.findMany({
    where: { companyId: session.user.companyId },
    select: {
      id: true, name: true, username: true, email: true, role: true,
      department: true, avatarUrl: true, managerId: true,
      contactNumber: true, contactAddress: true, engagementType: true,
      engagementStart: true, accessStatus: true, lastLoginAt: true,
      projectMemberships: {
        select: {
          project: { select: { id: true, name: true, code: true } },
          roles: { select: { role: { select: { id: true, name: true } } } },
        },
      },
    },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const subscription = await prisma.subscription.findUnique({
    where: { companyId: session.user.companyId },
    include: { plan: true },
  })
  if (!subscription || subscription.status !== 'ACTIVE')
    return NextResponse.json({ error: 'No active subscription' }, { status: 402 })

  const userCount = await prisma.user.count({ where: { companyId: session.user.companyId } })
  if (userCount >= subscription.plan.maxUsers) {
    return NextResponse.json(
      { error: `User limit reached for your plan (${subscription.plan.name}: ${subscription.plan.maxUsers} users). Upgrade to add more.` },
      { status: 403 },
    )
  }

  const {
    name, username, email, password, role, department, managerId,
    contactNumber, contactAddress, engagementType, engagementStart,
  } = await req.json()

  if (!name || !username || !password)
    return NextResponse.json({ error: 'Name, username, and password are required' }, { status: 400 })

  const usernameTaken = await prisma.user.findUnique({
    where: { companyId_username: { companyId: session.user.companyId, username } },
  })
  if (usernameTaken) return NextResponse.json({ error: 'Username already exists' }, { status: 400 })

  if (email) {
    const existing = await prisma.user.findUnique({
      where: { companyId_email: { companyId: session.user.companyId, email } },
    })
    if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      companyId: session.user.companyId, name, username, email, password: hashed,
      role, department, managerId,
      contactNumber, contactAddress, engagementType, engagementStart,
    },
    select: { id: true, name: true, username: true, email: true, role: true, department: true },
  })

  return NextResponse.json(user, { status: 201 })
}
