import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projects = await prisma.project.findMany({
    where: { companyId: session.user.companyId, isActive: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(projects)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const subscription = await prisma.subscription.findUnique({
    where: { companyId: session.user.companyId },
    include: { plan: true },
  })
  if (!subscription || subscription.status !== 'ACTIVE')
    return NextResponse.json({ error: 'No active subscription' }, { status: 402 })

  const activeProjectCount = await prisma.project.count({
    where: { companyId: session.user.companyId, isActive: true },
  })
  if (activeProjectCount >= subscription.plan.maxProjects) {
    return NextResponse.json(
      { error: `Project limit reached for your plan (${subscription.plan.name}: ${subscription.plan.maxProjects} projects). Upgrade to add more.` },
      { status: 403 },
    )
  }

  const body = await req.json()
  const project = await prisma.project.create({ data: { ...body, companyId: session.user.companyId } })

  // Every project starts with the four locked entry types, per the doc: "Cannot delete or edit".
  await prisma.entryType.createMany({
    data: [
      { projectId: project.id, name: 'Standard Hours', shortCode: 'STD', isSystem: true, systemType: 'STANDARD' },
      { projectId: project.id, name: 'Overtime Hours', shortCode: 'OT', isSystem: true, systemType: 'OVERTIME' },
      { projectId: project.id, name: 'Weekend Hours', shortCode: 'WKND', isSystem: true, systemType: 'WEEKEND' },
      { projectId: project.id, name: 'Holiday Hours', shortCode: 'HOL', isSystem: true, systemType: 'HOLIDAY' },
    ],
  })

  // Default workflow: Employee -> Closed (no middle stages) until the Admin configures one.
  const defaultWorkflow = await prisma.approvalWorkflow.create({
    data: { projectId: project.id, type: 'DEFAULT' },
  })
  await prisma.workflowStage.create({
    data: { workflowId: defaultWorkflow.id, order: 1, isTerminal: true },
  })

  return NextResponse.json(project, { status: 201 })
}
