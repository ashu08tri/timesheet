import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfWeek, startOfMonth, endOfMonth, subWeeks, format, addDays } from 'date-fns'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now        = new Date()
  const weekStart  = startOfWeek(now, { weekStartsOn: 1 })
  const monthStart = startOfMonth(now)
  const monthEnd   = endOfMonth(now)

  const userId    = session.user.id
  const isManager = ['MANAGER', 'ADMIN'].includes(session.user.role)

  // This week's hours
  const thisWeekTimesheet = await prisma.timesheet.findFirst({
    where: { userId, weekStart },
    include: { entries: true },
  })
  const totalHoursThisWeek = thisWeekTimesheet?.entries.reduce((s, e) => s + e.hours, 0) ?? 0

  // This month's hours
  const monthTimesheets = await prisma.timesheet.findMany({
    where: { userId, weekStart: { gte: monthStart, lte: monthEnd } },
    include: { entries: true },
  })
  const totalHoursThisMonth = monthTimesheets.flatMap(t => t.entries).reduce((s, e) => s + e.hours, 0)

  // Pending approvals (for managers)
  let pendingApprovals = 0
  if (isManager) {
    pendingApprovals = await prisma.timesheet.count({
      where: { status: { in: ['SUBMITTED', 'IN_REVIEW'] } },
    })
  }

  // Approved this month
  const approvedThisMonth = await prisma.timesheet.count({
    where: {
      userId,
      status: 'APPROVED',
      weekStart: { gte: monthStart, lte: monthEnd },
    },
  })

  // Weekly data for chart (last 8 weeks) — wEnd removed, not needed
  const weeklyData = []
  for (let i = 7; i >= 0; i--) {
    const wStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 })
    const ts = await prisma.timesheet.findFirst({
      where: { userId, weekStart: wStart },
      include: { entries: true },
    })
    weeklyData.push({
      week:  format(wStart, 'MMM d'),
      hours: ts?.entries.reduce((s, e) => s + e.hours, 0) ?? 0,
    })
  }

  // Project breakdown (this month)
  const allEntries = monthTimesheets.flatMap(t => t.entries)
  const entryIds   = allEntries.map(e => e.id)

  const entriesWithProjects = await prisma.timesheetEntry.findMany({
    where: { id: { in: entryIds } },
    include: { project: true },
  })

  const projectMap = new Map<string, { name: string; hours: number; color: string }>()
  for (const entry of entriesWithProjects) {
    const existing = projectMap.get(entry.projectId)
    if (existing) existing.hours += entry.hours
    else projectMap.set(entry.projectId, { name: entry.project.name, hours: entry.hours, color: entry.project.color })
  }
  const projectBreakdown = Array.from(projectMap.values()).sort((a, b) => b.hours - a.hours)

  // Status breakdown
  const statusCounts = await prisma.timesheet.groupBy({
    by: ['status'],
    where: { userId },
    _count: { status: true },
  })

  return NextResponse.json({
    totalHoursThisWeek,
    totalHoursThisMonth,
    pendingApprovals,
    approvedThisMonth,
    weeklyData,
    projectBreakdown,
    statusCounts: Object.fromEntries(statusCounts.map(s => [s.status, s._count.status])),
  })
}