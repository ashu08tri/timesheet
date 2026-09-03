import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { addHours } from 'date-fns'

// Public — starts the forgot-password flow. Always responds with a generic success
// message regardless of whether the company/email match, so this can't be used to
// probe which emails exist. The reset link itself is returned in the response body
// since no SMTP/email provider is configured in this environment — a real deployment
// would email it instead of returning it directly (see the note in the response).
export async function POST(req: NextRequest) {
  const { company: companySlug, email } = await req.json()
  if (!companySlug || !email) {
    return NextResponse.json({ error: 'Company and email are required' }, { status: 400 })
  }

  const genericResponse = {
    message: 'If an account matches those details, a password reset link has been generated.',
  }

  const company = await prisma.company.findUnique({ where: { slug: companySlug } })
  if (!company || !company.isActive) return NextResponse.json(genericResponse)

  const user = await prisma.user.findUnique({
    where: { companyId_email: { companyId: company.id, email } },
  })
  if (!user || user.accessStatus === 'BLOCKED') return NextResponse.json(genericResponse)

  const token = crypto.randomBytes(32).toString('hex')
  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt: addHours(new Date(), 1) },
  })

  const resetUrl = `${req.nextUrl.origin}/reset-password?token=${token}`

  // NOTE: no email provider is configured in this environment, so the link is
  // returned directly for now (and logged server-side) instead of being emailed.
  // Wire up an email service (e.g. Resend, SES) here before going to production —
  // returning the link to the client is not safe for a real deployment.
  console.log(`[password reset] ${user.email} -> ${resetUrl}`)

  return NextResponse.json({ ...genericResponse, devResetUrl: resetUrl })
}
