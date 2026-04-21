import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfWeek, endOfWeek } from 'date-fns'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const userId   = searchParams.get('userId')
  const status   = searchParams.get('status')
  const teamOnly = searchParams.get('team') === 'true'

  let where: any = {}

  // Resolve "me" shorthand
  const resolvedUserId = userId === 'me' ? session.user.id : userId

  if (session.user.role === 'EMPLOYEE') {
    // Employees can only see their own timesheets
    where.userId = session.user.id
  } else if (teamOnly && session.user.role === 'MANAGER') {
    // Managers fetching their team's timesheets
    const employees = await prisma.user.findMany({
      where: { managerId: session.user.id },
      select: { id: true },
    })
    where.userId = { in: employees.map((e) => e.id) }
  } else if (teamOnly && session.user.role === 'ADMIN') {
    // Admins fetching all team timesheets — no userId filter
  } else if (resolvedUserId) {
    where.userId = resolvedUserId
  } else {
    // Default: own timesheets only
    where.userId = session.user.id
  }

  if (status) where.status = status

  const timesheets = await prisma.timesheet.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, role: true, department: true, avatarUrl: true } },
      reviewer: { select: { id: true, name: true, email: true, role: true, department: true, avatarUrl: true } },
      entries: {
        include: {
          project: { select: { id: true, name: true, code: true, color: true } },
        },
        orderBy: { date: 'asc' },
      },
    },
    orderBy: { weekStart: 'desc' },
  })

  return NextResponse.json(timesheets)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { weekStart: weekStartStr } = await req.json()
  const weekStart = new Date(weekStartStr)
  const weekEnd   = endOfWeek(weekStart, { weekStartsOn: 1 })

  const existing = await prisma.timesheet.findUnique({
    where: { userId_weekStart: { userId: session.user.id, weekStart } },
  })
  if (existing) return NextResponse.json(existing)

  const timesheet = await prisma.timesheet.create({
    data: {
      userId:    session.user.id,
      weekStart,
      weekEnd,
      status:    'DRAFT',
      totalHours: 0,
    },
    include: {
      user:    { select: { id: true, name: true, email: true, role: true, department: true, avatarUrl: true } },
      entries: { include: { project: true } },
    },
  })

  return NextResponse.json(timesheet)
}
