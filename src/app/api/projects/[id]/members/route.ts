import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getOwnedProject(companyId: string, projectId: string) {
  return prisma.project.findFirst({ where: { id: projectId, companyId } })
}

// View Members list: name, employee code, start date, roles — per the doc's
// Manage Projects > Project Members screen.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const project = await getOwnedProject(session.user.companyId, id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const members = await prisma.projectMembership.findMany({
    where: { projectId: id },
    include: {
      user: { select: { id: true, name: true, username: true, email: true, avatarUrl: true } },
      roles: { include: { role: { select: { id: true, name: true } } } },
    },
    orderBy: { startDate: 'asc' },
  })
  return NextResponse.json(members)
}

// Add Members: select a team member from master, select role(s), select start date.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const project = await getOwnedProject(session.user.companyId, id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { userId, roleIds, startDate } = await req.json()
  if (!userId || !Array.isArray(roleIds) || !roleIds.length)
    return NextResponse.json({ error: 'userId and at least one roleId are required' }, { status: 400 })

  const user = await prisma.user.findFirst({ where: { id: userId, companyId: session.user.companyId } })
  if (!user) return NextResponse.json({ error: 'User not found in this company' }, { status: 400 })

  const roleCount = await prisma.projectRole.count({ where: { id: { in: roleIds }, companyId: session.user.companyId } })
  if (roleCount !== roleIds.length)
    return NextResponse.json({ error: 'One or more roleIds are invalid for this company' }, { status: 400 })

  const existing = await prisma.projectMembership.findUnique({
    where: { projectId_userId: { projectId: id, userId } },
  })
  if (existing) return NextResponse.json({ error: 'This user is already a member of this project' }, { status: 400 })

  const membership = await prisma.projectMembership.create({
    data: {
      projectId: id,
      userId,
      startDate: startDate ? new Date(startDate) : new Date(),
      roles: { create: roleIds.map((roleId: string) => ({ roleId })) },
    },
    include: {
      user: { select: { id: true, name: true, username: true, email: true, avatarUrl: true } },
      roles: { include: { role: { select: { id: true, name: true } } } },
    },
  })
  return NextResponse.json(membership, { status: 201 })
}
