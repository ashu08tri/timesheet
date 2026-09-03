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

  const workflows = await prisma.approvalWorkflow.findMany({
    where: { projectId: id },
    include: { stages: { orderBy: { order: 'asc' }, include: { role: true } } },
  })
  return NextResponse.json(workflows)
}
