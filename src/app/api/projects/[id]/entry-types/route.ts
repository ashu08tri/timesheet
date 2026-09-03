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

  const entryTypes = await prisma.entryType.findMany({ where: { projectId: id }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json(entryTypes)
}

// Add a custom entry type (e.g. Sick Leave, Personal Leave, Emergency Leave, Travel
// for Work). The four system types (Standard/Overtime/Weekend/Holiday) are seeded
// automatically when a project is created and can't be added again here.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const project = await prisma.project.findFirst({ where: { id, companyId: session.user.companyId } })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { name, shortCode } = await req.json()
  if (!name || !shortCode)
    return NextResponse.json({ error: 'name and shortCode are required' }, { status: 400 })

  const existing = await prisma.entryType.findUnique({
    where: { projectId_shortCode: { projectId: id, shortCode } },
  })
  if (existing) return NextResponse.json({ error: 'That short code is already used on this project' }, { status: 400 })

  const entryType = await prisma.entryType.create({
    data: { projectId: id, name, shortCode, isSystem: false },
  })
  return NextResponse.json(entryType, { status: 201 })
}
