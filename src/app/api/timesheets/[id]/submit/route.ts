import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const timesheet = await prisma.timesheet.findUnique({ where: { id } })
  if (!timesheet) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (timesheet.userId !== session.user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!['DRAFT', 'REJECTED'].includes(timesheet.status))
    return NextResponse.json({ error: 'Cannot submit in current state' }, { status: 400 })

  const updated = await prisma.timesheet.update({
    where: { id },
    data: { status: 'SUBMITTED', submittedAt: new Date() },
  })

  return NextResponse.json(updated)
}
