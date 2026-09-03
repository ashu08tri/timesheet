import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveWorkflowForTimesheet } from '@/lib/workflow'
import { checkSubmissionGap, checkMinWeekHours, recalcOvertimeForTimesheet } from '@/lib/timesheet-rules'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const timesheet = await prisma.timesheet.findUnique({ where: { id } })
  if (!timesheet) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (timesheet.userId !== session.user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!['DRAFT', 'REVERTED'].includes(timesheet.status))
    return NextResponse.json({ error: 'Cannot submit in current state' }, { status: 400 })

  // Submission-gap rule: an earlier week still sitting in Draft blocks this one.
  const gapError = await checkSubmissionGap(session.user.id, timesheet.weekStart)
  if (gapError) return NextResponse.json({ error: gapError }, { status: 400 })

  // Recalculate overtime split before resolving the workflow — required on every
  // submit, and especially on resubmission of a reverted week where entries were
  // edited, so the OVERTIME workflow type is detected against up-to-date entries.
  await recalcOvertimeForTimesheet(id)

  const resolved = await resolveWorkflowForTimesheet(id)
  if (!resolved) return NextResponse.json({ error: 'Add at least one entry before submitting' }, { status: 400 })

  // Minimum-week-hours rule, if the governing project enforces it.
  const minHoursError = await checkMinWeekHours(id, resolved.projectId)
  if (minHoursError) return NextResponse.json({ error: minHoursError }, { status: 400 })

  const stages = resolved.workflow?.stages ?? []
  const firstStage = stages[0]
  // No configured stages at all (shouldn't normally happen — projects get a default
  // Employee -> Closed workflow) means there's nothing to review: auto-approve.
  const noReviewStages = !firstStage || firstStage.isTerminal

  const updated = await prisma.timesheet.update({
    where: { id },
    data: {
      status: noReviewStages ? 'APPROVED' : 'SUBMITTED',
      submittedAt: new Date(),
      projectId: resolved.projectId,
      workflowType: resolved.workflowType,
      currentStageOrder: noReviewStages ? (firstStage?.order ?? 1) : 1,
      reviewedAt: noReviewStages ? new Date() : null,
    },
  })

  return NextResponse.json(updated)
}
