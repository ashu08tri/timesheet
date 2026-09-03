import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; entryTypeId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, entryTypeId } = await params
  const entryType = await prisma.entryType.findFirst({
    where: { id: entryTypeId, projectId: id, project: { companyId: session.user.companyId } },
  })
  if (!entryType) return NextResponse.json({ error: 'Entry type not found' }, { status: 404 })
  if (entryType.isSystem)
    return NextResponse.json({ error: 'Standard, Overtime, Weekend, and Holiday entry types cannot be deleted or edited' }, { status: 403 })

  await prisma.entryType.delete({ where: { id: entryTypeId } })
  return NextResponse.json({ success: true })
}
