import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { userHasProjectRole, stageAtOrder } from '@/lib/workflow'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { notes } = await req.json().catch(() => ({ notes: '' }))

  const timesheet = await prisma.timesheet.findUnique({ where: { id } })
  if (!timesheet) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['SUBMITTED', 'IN_REVIEW'].includes(timesheet.status))
    return NextResponse.json({ error: 'Cannot approve in current state' }, { status: 400 })
  if (!timesheet.projectId)
    return NextResponse.json({ error: 'Timesheet has no project/workflow assigned' }, { status: 400 })

  const workflow = await prisma.approvalWorkflow.findUnique({
    where: { projectId_type: { projectId: timesheet.projectId, type: timesheet.workflowType } },
    include: { stages: { orderBy: { order: 'asc' } } },
  })
  const currentStage = workflow ? stageAtOrder(workflow.stages, timesheet.currentStageOrder) : undefined
  if (!currentStage || currentStage.isTerminal || !currentStage.roleId)
    return NextResponse.json({ error: 'No pending approval stage found' }, { status: 400 })

  // Admins may always approve (super-user); everyone else must hold the stage's role
  // on this project, per the Role Master / project membership.
  if (session.user.role !== 'ADMIN') {
    const authorized = await userHasProjectRole(session.user.id, timesheet.projectId, currentStage.roleId)
    if (!authorized) return NextResponse.json({ error: 'You do not hold the role required for this approval stage' }, { status: 403 })
  }

  const nextStage = stageAtOrder(workflow!.stages, timesheet.currentStageOrder + 1)
  const isFinal = !nextStage || nextStage.isTerminal

  const updated = await prisma.timesheet.update({
    where: { id },
    data: {
      status: isFinal ? 'APPROVED' : 'IN_REVIEW',
      currentStageOrder: isFinal ? (nextStage?.order ?? timesheet.currentStageOrder + 1) : timesheet.currentStageOrder + 1,
      reviewedAt: new Date(),
      reviewedBy: session.user.id,
      reviewNotes: notes,
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, department: true, avatarUrl: true } },
    },
  })

  await prisma.approvalAction.create({
    data: { timesheetId: id, stageOrder: timesheet.currentStageOrder, actorId: session.user.id, action: 'APPROVE', comments: notes },
  })

  return NextResponse.json(updated)
}
