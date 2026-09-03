import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Lists reverted timesheets (weeks) visible to the caller: an Employee sees their
// own reverted weeks; a Manager/Admin/Verifier sees weeks they personally reverted.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope') // 'mine' (as employee) | 'byMe' (as reviewer)

  const where =
    scope === 'byMe'
      ? { status: 'REVERTED' as const, reviewedBy: session.user.id }
      : { status: 'REVERTED' as const, userId: session.user.id }

  const reverted = await prisma.timesheet.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
      reviewer: { select: { id: true, name: true } },
      entries: {
        include: { project: { select: { id: true, name: true, code: true, color: true } } },
        orderBy: { date: 'asc' },
      },
      approvalActions: {
        where: { action: 'REVERT' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { actor: { select: { id: true, name: true } } },
      },
    },
    orderBy: { reviewedAt: 'desc' },
  })

  return NextResponse.json(reverted)
}
