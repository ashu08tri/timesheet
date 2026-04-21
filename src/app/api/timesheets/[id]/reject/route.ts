import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['MANAGER', 'ADMIN'].includes(session.user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { notes } = await req.json().catch(() => ({ notes: '' }))

  if (!notes?.trim())
    return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })

  const timesheet = await prisma.timesheet.findUnique({ where: { id } })
  if (!timesheet) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['SUBMITTED', 'IN_REVIEW'].includes(timesheet.status))
    return NextResponse.json({ error: 'Cannot reject in current state' }, { status: 400 })

  const updated = await prisma.timesheet.update({
    where: { id },
    data: {
      status:      'REJECTED',
      reviewedAt:  new Date(),
      reviewedBy:  session.user.id,
      reviewNotes: notes,
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, department: true, avatarUrl: true } },
    },
  })

  return NextResponse.json(updated)
}
