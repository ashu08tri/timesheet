import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, format } from 'date-fns'

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const

// Per-day breakdown for a calendar month: total hours, split by entry type, and
// whether the day is a weekday/weekend/holiday (based on whichever project the
// user logged entries against that day — see the same simplification noted in
// src/lib/workflow.ts for weeks spanning multiple projects).
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const monthParam = searchParams.get('month') // 'YYYY-MM'
  const anchor = monthParam ? new Date(`${monthParam}-01T00:00:00`) : new Date()
  const from = startOfMonth(anchor)
  const to = endOfMonth(anchor)

  const timesheets = await prisma.timesheet.findMany({
    where: { userId: session.user.id, weekEnd: { gte: from }, weekStart: { lte: to } },
    include: {
      entries: {
        include: { entryType: true, project: { include: { weekends: true, holidays: true } } },
      },
    },
  })

  const byDate = new Map<string, { hours: number; byType: Record<string, number>; isWeekend: boolean; isHoliday: boolean }>()

  for (const ts of timesheets) {
    for (const e of ts.entries) {
      if (e.date < from || e.date > to) continue
      const key = format(e.date, 'yyyy-MM-dd')
      const bucket = byDate.get(key) ?? { hours: 0, byType: {}, isWeekend: false, isHoliday: false }
      bucket.hours += e.hours
      const typeName = e.entryType?.name ?? 'Other'
      bucket.byType[typeName] = (bucket.byType[typeName] ?? 0) + e.hours

      const dayName = DAY_NAMES[e.date.getDay()]
      if (e.project.weekends.some(w => w.day === dayName)) bucket.isWeekend = true
      if (e.project.holidays.some(h => {
        const hd = new Date(h.date)
        return h.isRecurring
          ? hd.getMonth() === e.date.getMonth() && hd.getDate() === e.date.getDate()
          : hd.toDateString() === e.date.toDateString()
      })) bucket.isHoliday = true

      byDate.set(key, bucket)
    }
  }

  const days = []
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const key = format(d, 'yyyy-MM-dd')
    const bucket = byDate.get(key)
    const dayName = DAY_NAMES[d.getDay()]
    days.push({
      date: key,
      hours: bucket?.hours ?? 0,
      byType: bucket?.byType ?? {},
      dayType: bucket?.isHoliday ? 'HOLIDAY' : (bucket?.isWeekend || dayName === 'SAT' || dayName === 'SUN') ? 'WEEKEND' : 'WEEKDAY',
    })
  }

  return NextResponse.json({ month: format(anchor, 'yyyy-MM'), days })
}
