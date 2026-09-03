import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// "Employee" can't be renamed or deleted. "Project Manager" (and other system roles)
// can be renamed but not deleted. Custom roles can be renamed or deleted freely.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const role = await prisma.projectRole.findFirst({ where: { id, companyId: session.user.companyId } })
  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  if (role.name === 'Employee')
    return NextResponse.json({ error: 'The Employee role cannot be renamed' }, { status: 403 })

  const { name } = await req.json()
  if (!name || !name.trim())
    return NextResponse.json({ error: 'Role name is required' }, { status: 400 })

  const updated = await prisma.projectRole.update({ where: { id }, data: { name } })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const role = await prisma.projectRole.findFirst({ where: { id, companyId: session.user.companyId } })
  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  if (role.isSystem)
    return NextResponse.json({ error: 'System roles cannot be deleted' }, { status: 403 })

  await prisma.projectRole.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
