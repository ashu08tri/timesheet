import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const project = await prisma.project.findFirst({ where: { id, companyId: session.user.companyId } })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const holidays = await prisma.holiday.findMany({ where: { projectId: id }, orderBy: { date: 'asc' } })
  return NextResponse.json(holidays)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const project = await prisma.project.findFirst({ where: { id, companyId: session.user.companyId } })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { date, details, isRecurring } = await req.json()
  if (!date || !details)
    return NextResponse.json({ error: 'date and details are required' }, { status: 400 })

  const holiday = await prisma.holiday.create({
    data: { projectId: id, date: new Date(date), details, isRecurring: !!isRecurring },
  })
  return NextResponse.json(holiday, { status: 201 })
}
