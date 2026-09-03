import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { userHasProjectRole, stageAtOrder } from '@/lib/workflow'

// Revert (not reject) — matches the doc's terminology. Reopens the week for the
// employee to resubmit; resubmission restarts the configured workflow from stage 1,
// and recalculation of overtime happens on resubmission (see /submit).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { notes } = await req.json().catch(() => ({ notes: '' }))
  if (!notes?.trim())
    return NextResponse.json({ error: 'A comment is required to revert an entry' }, { status: 400 })

  const timesheet = await prisma.timesheet.findUnique({ where: { id } })
  if (!timesheet) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['SUBMITTED', 'IN_REVIEW'].includes(timesheet.status))
    return NextResponse.json({ error: 'Cannot revert in current state' }, { status: 400 })
  if (!timesheet.projectId)
    return NextResponse.json({ error: 'Timesheet has no project/workflow assigned' }, { status: 400 })

  const workflow = await prisma.approvalWorkflow.findUnique({
    where: { projectId_type: { projectId: timesheet.projectId, type: timesheet.workflowType } },
    include: { stages: { orderBy: { order: 'asc' } } },
  })
  const currentStage = workflow ? stageAtOrder(workflow.stages, timesheet.currentStageOrder) : undefined
  if (!currentStage || currentStage.isTerminal || !currentStage.roleId)
    return NextResponse.json({ error: 'No pending approval stage found' }, { status: 400 })

  if (session.user.role !== 'ADMIN') {
    const authorized = await userHasProjectRole(session.user.id, timesheet.projectId, currentStage.roleId)
    if (!authorized) return NextResponse.json({ error: 'You do not hold the role required for this stage' }, { status: 403 })
  }

  const updated = await prisma.timesheet.update({
    where: { id },
    data: {
      status: 'REVERTED',
      currentStageOrder: 0,
      reviewedAt: new Date(),
      reviewedBy: session.user.id,
      reviewNotes: notes,
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, department: true, avatarUrl: true } },
    },
  })

  await prisma.approvalAction.create({
    data: { timesheetId: id, stageOrder: timesheet.currentStageOrder, actorId: session.user.id, action: 'REVERT', comments: notes },
  })

  return NextResponse.json(updated)
}
