import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfWeek, subDays, subWeeks, format, startOfDay, endOfDay } from 'date-fns'

const ENTRY_COLORS: Record<string, string> = {
  STANDARD: '#6366f1', OVERTIME: '#f59e0b', WEEKEND: '#0ea5e9', HOLIDAY: '#10b981', CUSTOM: '#a855f7',
}
const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#9ca3af', SUBMITTED: '#3b82f6', IN_REVIEW: '#f59e0b', APPROVED: '#10b981', REVERTED: '#ef4444',
}

// Powers the "Timesheet Overview" chart: each bar can be layered by entry type
// (Standard/Overtime/Weekend/Holiday/custom) or by status (Draft/Submitted/Under
// Review/Approved/Reverted), viewed by day (up to 30 bars) or by week (up to 52).
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const view = searchParams.get('view') === 'week' ? 'week' : 'day'
  const requestedDays = Math.min(parseInt(searchParams.get('days') ?? '30', 10) || 30, 30)
  const requestedWeeks = Math.min(parseInt(searchParams.get('weeks') ?? '12', 10) || 12, 52)

  const userId = session.user.id
  const now = new Date()

  if (view === 'day') {
    const from = startOfDay(subDays(now, requestedDays - 1))
    const to = endOfDay(now)

    const timesheets = await prisma.timesheet.findMany({
      where: { userId, weekEnd: { gte: from }, weekStart: { lte: to } },
      include: { entries: { include: { entryType: true } } },
    })

    const byDate = new Map<string, { types: Record<string, number>; status: string; standardCap: number }>()
    for (const ts of timesheets) {
      for (const e of ts.entries) {
        if (e.date < from || e.date > to) continue
        const key = format(e.date, 'yyyy-MM-dd')
        const bucket = byDate.get(key) ?? { types: {}, status: ts.status, standardCap: 8 }
        const typeKey = e.entryType?.systemType ?? 'CUSTOM'
        bucket.types[typeKey] = (bucket.types[typeKey] ?? 0) + e.hours
        byDate.set(key, bucket)
      }
    }

    const days = []
    for (let i = requestedDays - 1; i >= 0; i--) {
      const d = subDays(now, i)
      const key = format(d, 'yyyy-MM-dd')
      const bucket = byDate.get(key)
      days.push({
        label: format(d, 'MMM d'),
        date: key,
        standard: bucket?.types['STANDARD'] ?? 0,
        overtime: bucket?.types['OVERTIME'] ?? 0,
        weekend: bucket?.types['WEEKEND'] ?? 0,
        holiday: bucket?.types['HOLIDAY'] ?? 0,
        custom: bucket?.types['CUSTOM'] ?? 0,
        status: bucket?.status ?? null,
        standardCap: bucket?.standardCap ?? 8,
      })
    }

    return NextResponse.json({ view, data: days, colors: { entryType: ENTRY_COLORS, status: STATUS_COLORS } })
  }

  // view === 'week'
  const weeks = []
  for (let i = requestedWeeks - 1; i >= 0; i--) {
    const wStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 })
    const ts = await prisma.timesheet.findFirst({
      where: { userId, weekStart: wStart },
      include: { entries: { include: { entryType: true } } },
    })
    const types: Record<string, number> = {}
    for (const e of ts?.entries ?? []) {
      const typeKey = e.entryType?.systemType ?? 'CUSTOM'
      types[typeKey] = (types[typeKey] ?? 0) + e.hours
    }
    weeks.push({
      label: format(wStart, 'MMM d'),
      date: format(wStart, 'yyyy-MM-dd'),
      standard: types['STANDARD'] ?? 0,
      overtime: types['OVERTIME'] ?? 0,
      weekend: types['WEEKEND'] ?? 0,
      holiday: types['HOLIDAY'] ?? 0,
      custom: types['CUSTOM'] ?? 0,
      status: ts?.status ?? null,
      standardCap: 40,
    })
  }

  return NextResponse.json({ view, data: weeks, colors: { entryType: ENTRY_COLORS, status: STATUS_COLORS } })
}
