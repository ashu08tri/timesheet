import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const VALID_TYPES = ['DEFAULT', 'OVERTIME', 'WEEKEND', 'LEAVE', 'ESCALATION', 'HOLIDAY']

// Define (or replace) the approval workflow for one type on a project.
// Body: { roleIds: string[] } — an ordered list of Role Master role ids for the
// stages between Employee (implicit first stage) and Closed (implicit last stage).
// e.g. roleIds: [projectManagerRoleId] gives Employee -> Project Manager -> Closed.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; type: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, type } = await params
  const workflowType = type.toUpperCase()
  if (!VALID_TYPES.includes(workflowType))
    return NextResponse.json({ error: `type must be one of ${VALID_TYPES.join(', ')}` }, { status: 400 })

  const project = await prisma.project.findFirst({ where: { id, companyId: session.user.companyId } })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { roleIds } = await req.json()
  if (!Array.isArray(roleIds))
    return NextResponse.json({ error: 'roleIds must be an array (may be empty for Employee -> Closed)' }, { status: 400 })

  // Confirm every role belongs to this company's Role Master.
  if (roleIds.length) {
    const count = await prisma.projectRole.count({
      where: { id: { in: roleIds }, companyId: session.user.companyId },
    })
    if (count !== roleIds.length)
      return NextResponse.json({ error: 'One or more roleIds are invalid for this company' }, { status: 400 })
  }

  const workflow = await prisma.approvalWorkflow.upsert({
    where: { projectId_type: { projectId: id, type: workflowType as never } },
    create: { projectId: id, type: workflowType as never },
    update: {},
  })

  // Replace stages: middle stages come from roleIds (order 1..n), then a terminal
  // Closed stage. Employee, the first stage, is implicit and not stored.
  await prisma.workflowStage.deleteMany({ where: { workflowId: workflow.id } })
  await prisma.workflowStage.createMany({
    data: [
      ...roleIds.map((roleId: string, i: number) => ({
        workflowId: workflow.id, order: i + 1, roleId, isTerminal: false,
      })),
      { workflowId: workflow.id, order: roleIds.length + 1, roleId: null, isTerminal: true },
    ],
  })

  const full = await prisma.approvalWorkflow.findUnique({
    where: { id: workflow.id },
    include: { stages: { orderBy: { order: 'asc' }, include: { role: true } } },
  })
  return NextResponse.json(full)
}
