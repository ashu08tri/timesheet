import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WeekDay } from '@prisma/client'

async function getOwnedProject(companyId: string, projectId: string) {
  return prisma.project.findFirst({ where: { id: projectId, companyId } })
}

// Get the full Project Config: hour config, weekends, entry types, holidays, workflows.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const project = await prisma.project.findFirst({
    where: { id, companyId: session.user.companyId },
    include: {
      weekends: true,
      holidays: { orderBy: { date: 'asc' } },
      entryTypes: { orderBy: { createdAt: 'asc' } },
      workflows: { include: { stages: { orderBy: { order: 'asc' }, include: { role: true } } } },
    },
  })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  return NextResponse.json(project)
}

// Update Hour Config (standard day hours, minimum week hours) and weekend days.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const project = await getOwnedProject(session.user.companyId, id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { standardDayHours, minWeekHoursEnabled, minWeekHours, weekendDays } = await req.json()

  const updated = await prisma.project.update({
    where: { id },
    data: {
      ...(standardDayHours !== undefined && { standardDayHours }),
      ...(minWeekHoursEnabled !== undefined && { minWeekHoursEnabled }),
      ...(minWeekHours !== undefined && { minWeekHours }),
    },
  })

  // weekendDays is an optional full replace: e.g. ["SAT", "SUN"]
  if (Array.isArray(weekendDays)) {
    await prisma.projectWeekend.deleteMany({ where: { projectId: id } })
    if (weekendDays.length) {
      await prisma.projectWeekend.createMany({
        data: weekendDays.map((day: string) => ({
          projectId: id,
          day: day as WeekDay,
        })),
      })
    }
  }

  return NextResponse.json(updated)
}
