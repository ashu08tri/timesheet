import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { addMonths, addYears } from 'date-fns'

// Public sign-up: creates a Company, subscribes it to a Plan (monthly or annual),
// seeds its Role Master, and creates the first user as that company's Admin.
export async function POST(req: NextRequest) {
  const { companyName, slug, planId, billingCycle, adminName, adminEmail, adminUsername, password } = await req.json()

  if (!companyName || !slug || !planId || !adminName || !adminUsername || !password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Company ID can only contain lowercase letters, numbers, and hyphens' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const existingCompany = await prisma.company.findUnique({ where: { slug } })
  if (existingCompany) return NextResponse.json({ error: 'That company ID is already taken' }, { status: 400 })

  const plan = await prisma.plan.findUnique({ where: { id: planId } })
  if (!plan || !plan.isActive) return NextResponse.json({ error: 'Selected plan is not available' }, { status: 400 })

  const cycle = billingCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY'
  const periodEnd = cycle === 'ANNUAL' ? addYears(new Date(), 1) : addMonths(new Date(), 1)

  const hashed = await bcrypt.hash(password, 10)

  const company = await prisma.$transaction(async tx => {
    const company = await tx.company.create({ data: { name: companyName, slug } })

    await tx.subscription.create({
      data: {
        companyId: company.id,
        planId: plan.id,
        billingCycle: cycle,
        status: 'ACTIVE',
        currentPeriodEnd: periodEnd,
      },
    })

    // Seed the Role Master with the two system roles every company needs.
    await tx.projectRole.createMany({
      data: [
        { companyId: company.id, name: 'Employee', isSystem: true },
        { companyId: company.id, name: 'Project Manager', isSystem: true },
      ],
    })

    await tx.user.create({
      data: {
        companyId: company.id,
        name: adminName,
        username: adminUsername,
        email: adminEmail || null,
        password: hashed,
        role: 'ADMIN',
        accessStatus: 'ACTIVE',
      },
    })

    return company
  })

  return NextResponse.json({ success: true, companySlug: company.slug }, { status: 201 })
}
