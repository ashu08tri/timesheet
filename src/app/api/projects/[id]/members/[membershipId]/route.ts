import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getOwnedMembership(companyId: string, projectId: string, membershipId: string) {
  return prisma.projectMembership.findFirst({
    where: { id: membershipId, projectId, project: { companyId } },
  })
}

// Edit Roles: replace which role(s) this member holds on the project.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; membershipId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, membershipId } = await params
  const membership = await getOwnedMembership(session.user.companyId, id, membershipId)
  if (!membership) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const { roleIds, startDate } = await req.json()

  if (Array.isArray(roleIds)) {
    if (!roleIds.length)
      return NextResponse.json({ error: 'At least one role is required' }, { status: 400 })
    const roleCount = await prisma.projectRole.count({ where: { id: { in: roleIds }, companyId: session.user.companyId } })
    if (roleCount !== roleIds.length)
      return NextResponse.json({ error: 'One or more roleIds are invalid for this company' }, { status: 400 })

    await prisma.projectMembershipRole.deleteMany({ where: { membershipId } })
    await prisma.projectMembershipRole.createMany({
      data: roleIds.map((roleId: string) => ({ membershipId, roleId })),
    })
  }

  if (startDate) {
    await prisma.projectMembership.update({ where: { id: membershipId }, data: { startDate: new Date(startDate) } })
  }

  const updated = await prisma.projectMembership.findUnique({
    where: { id: membershipId },
    include: {
      user: { select: { id: true, name: true, username: true, email: true, avatarUrl: true } },
      roles: { include: { role: { select: { id: true, name: true } } } },
    },
  })
  return NextResponse.json(updated)
}

// Remove this member from the project entirely.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; membershipId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, membershipId } = await params
  const membership = await getOwnedMembership(session.user.companyId, id, membershipId)
  if (!membership) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  await prisma.projectMembership.delete({ where: { id: membershipId } })
  return NextResponse.json({ success: true })
}
