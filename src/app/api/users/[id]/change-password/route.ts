import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const isSelf = session.user.id === id
  const isAdmin = session.user.role === 'ADMIN'
  if (!isSelf && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const target = await prisma.user.findFirst({ where: { id, companyId: session.user.companyId } })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { newPassword } = await req.json()
  if (!newPassword || newPassword.length < 8)
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })

  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id }, data: { password: hashed } })
  await prisma.userActivityLog.create({
    data: { userId: id, action: 'PASSWORD_CHANGED', detail: isSelf ? 'Self-service' : 'Changed by admin' },
  })

  return NextResponse.json({ success: true })
}
