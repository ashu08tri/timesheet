import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const timesheet = await prisma.timesheet.findUnique({
    where: { id },
    include: {
      user:     { select: { id: true, name: true, email: true, role: true, department: true, avatarUrl: true } },
      reviewer: { select: { id: true, name: true, email: true, role: true, department: true, avatarUrl: true } },
      entries: {
        include: { project: { select: { id: true, name: true, code: true, color: true } } },
        orderBy: { date: 'asc' },
      },
    },
  })

  if (!timesheet) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.user.role === 'EMPLOYEE' && timesheet.userId !== session.user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json(timesheet)
}

interface EntryInput {
  id?: string
  projectId: string
  date: string
  hours: number
  description?: string
  isBillable?: boolean
}

interface UpdateBody {
  entries?: EntryInput[]
  notes?: string
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body: UpdateBody = await req.json()

  const timesheet = await prisma.timesheet.findUnique({ where: { id } })
  if (!timesheet) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (timesheet.userId !== session.user.id && session.user.role === 'EMPLOYEE')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (body.entries) {
    // Delete entries that are no longer present
    const incomingIds = body.entries.filter(e => e.id).map(e => e.id as string)
    await prisma.timesheetEntry.deleteMany({
      where: { timesheetId: id, id: { notIn: incomingIds } },
    })

    // Upsert each entry
    for (const entry of body.entries) {
      if (entry.id) {
        await prisma.timesheetEntry.update({
          where: { id: entry.id },
          data: {
            projectId:   entry.projectId,
            hours:       entry.hours,
            description: entry.description ?? '',
            isBillable:  entry.isBillable ?? true,
          },
        })
      } else {
        await prisma.timesheetEntry.create({
          data: {
            timesheetId: id,
            projectId:   entry.projectId,
            date:        new Date(entry.date),
            hours:       entry.hours,
            description: entry.description ?? '',
            isBillable:  entry.isBillable ?? true,
          },
        })
      }
    }

    // Recalculate total hours
    const entries     = await prisma.timesheetEntry.findMany({ where: { timesheetId: id } })
    const totalHours  = entries.reduce((sum, e) => sum + e.hours, 0)
    await prisma.timesheet.update({ where: { id }, data: { totalHours, notes: body.notes } })
  }

  const updated = await prisma.timesheet.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, department: true, avatarUrl: true } },
      entries: {
        include: { project: { select: { id: true, name: true, code: true, color: true } } },
        orderBy: { date: 'asc' },
      },
    },
  })

  return NextResponse.json(updated)
}