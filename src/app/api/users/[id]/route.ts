import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// User Master > Overview: full details for one user, including project/role mappings
// and recent activity log.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || !['MANAGER', 'ADMIN'].includes(session.user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const user = await prisma.user.findFirst({
    where: { id, companyId: session.user.companyId },
    select: {
      id: true, name: true, username: true, email: true, role: true, department: true,
      contactNumber: true, contactAddress: true, engagementType: true, engagementStart: true,
      accessStatus: true, lastLoginAt: true, createdAt: true,
      projectMemberships: {
        select: {
          startDate: true,
          project: { select: { id: true, name: true, code: true } },
          roles: { select: { role: { select: { id: true, name: true } } } },
        },
      },
      activityLogs: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json(user)
}

// Edit User Master fields, or block/unblock access (accessStatus), or change details.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const existing = await prisma.user.findFirst({ where: { id, companyId: session.user.companyId } })
  if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const {
    name, department, contactNumber, contactAddress,
    engagementType, engagementStart, accessStatus, managerId,
  } = await req.json()

  const updated = await prisma.user.update({
    where: { id },
    data: { name, department, contactNumber, contactAddress, engagementType, engagementStart, accessStatus, managerId },
    select: { id: true, name: true, accessStatus: true },
  })

  if (accessStatus && accessStatus !== existing.accessStatus) {
    await prisma.userActivityLog.create({
      data: {
        userId: id,
        action: accessStatus === 'BLOCKED' ? 'ACCESS_BLOCKED' : 'ACCESS_UNBLOCKED',
        detail: `Changed by ${session.user.name ?? session.user.email ?? 'admin'}`,
      },
    })
  }

  return NextResponse.json(updated)
}
