import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function assertOwnership(companyId: string, projectId: string, holidayId: string) {
  const holiday = await prisma.holiday.findFirst({
    where: { id: holidayId, projectId, project: { companyId } },
  })
  return holiday
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; holidayId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, holidayId } = await params
  const existing = await assertOwnership(session.user.companyId, id, holidayId)
  if (!existing) return NextResponse.json({ error: 'Holiday not found' }, { status: 404 })

  const { date, details, isRecurring } = await req.json()
  const updated = await prisma.holiday.update({
    where: { id: holidayId },
    data: {
      ...(date && { date: new Date(date) }),
      ...(details !== undefined && { details }),
      ...(isRecurring !== undefined && { isRecurring }),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; holidayId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, holidayId } = await params
  const existing = await assertOwnership(session.user.companyId, id, holidayId)
  if (!existing) return NextResponse.json({ error: 'Holiday not found' }, { status: 404 })

  await prisma.holiday.delete({ where: { id: holidayId } })
  return NextResponse.json({ success: true })
}
