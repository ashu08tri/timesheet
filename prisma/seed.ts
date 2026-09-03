import { PrismaClient, Role, TimesheetStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { startOfWeek, endOfWeek, addDays, subWeeks } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clean up (order matters due to FKs)
  await prisma.timesheetEntry.deleteMany()
  await prisma.timesheet.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.company.deleteMany()
  await prisma.plan.deleteMany()
  await prisma.superAdmin.deleteMany()

  const password = await bcrypt.hash('password123', 10)

  // Platform-level super admin (not tied to a company)
  await prisma.superAdmin.create({
    data: {
      name: 'Platform Owner',
      email: 'superadmin@timepro.com',
      password,
    },
  })

  // Plans available on the platform
  const freePlan = await prisma.plan.create({
    data: { name: 'Free', maxProjects: 1, maxUsers: 10, monthlyPrice: 0, annualPrice: 0 },
  })
  const planA = await prisma.plan.create({
    data: { name: 'Plan A', maxProjects: 3, maxUsers: 30, monthlyPrice: 29, annualPrice: 290 },
  })
  const planB = await prisma.plan.create({
    data: { name: 'Plan B', maxProjects: 10, maxUsers: 100, monthlyPrice: 99, annualPrice: 990 },
  })
  void freePlan
  void planB

  // A subscribing company, on Plan A billed monthly
  const company = await prisma.company.create({
    data: { name: 'Timepro Demo Co', slug: 'timepro-demo' },
  })
  await prisma.subscription.create({
    data: {
      companyId: company.id,
      planId: planA.id,
      billingCycle: 'MONTHLY',
      status: 'ACTIVE',
      currentPeriodEnd: addDays(new Date(), 30),
    },
  })

  // Create admin
  const admin = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Alex Admin',
      username: 'alex.admin',
      email: 'admin@timepro.com',
      password,
      role: Role.ADMIN,
      department: 'Operations',
      engagementType: 'PERMANENT',
      engagementStart: new Date('2023-01-10'),
      accessStatus: 'ACTIVE',
    },
  })

  // Create managers
  const manager1 = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Morgan Manager',
      username: 'morgan.manager',
      email: 'manager@timepro.com',
      password,
      role: Role.MANAGER,
      department: 'Engineering',
      contactNumber: '+91 90000 11111',
      engagementType: 'PERMANENT',
      engagementStart: new Date('2023-03-01'),
      accessStatus: 'ACTIVE',
    },
  })

  const manager2 = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Sam Supervisor',
      username: 'sam.supervisor',
      email: 'sam@timepro.com',
      password,
      role: Role.MANAGER,
      department: 'Design',
      engagementType: 'PERMANENT',
      engagementStart: new Date('2023-04-15'),
      accessStatus: 'ACTIVE',
    },
  })

  // Create employees
  const emp1 = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Jordan Developer',
      username: 'jordan.dev',
      email: 'jordan@timepro.com',
      password,
      role: Role.EMPLOYEE,
      department: 'Engineering',
      managerId: manager1.id,
      engagementType: 'PERMANENT',
      engagementStart: new Date('2023-06-01'),
      accessStatus: 'ACTIVE',
    },
  })

  const emp2 = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Riley Engineer',
      username: 'riley.eng',
      email: 'riley@timepro.com',
      password,
      role: Role.EMPLOYEE,
      department: 'Engineering',
      managerId: manager1.id,
      engagementType: 'CONTRACT',
      engagementStart: new Date('2024-01-15'),
      accessStatus: 'ACTIVE',
    },
  })

  const emp3 = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Casey Designer',
      username: 'casey.design',
      email: 'casey@timepro.com',
      password,
      role: Role.EMPLOYEE,
      department: 'Design',
      managerId: manager2.id,
      engagementType: 'TEMPORARY',
      engagementStart: new Date('2024-02-01'),
      accessStatus: 'ACTIVE',
    },
  })

  // Role Master: system roles (can't be deleted) + one custom role the Company Admin added
  const employeeRole = await prisma.projectRole.create({
    data: { companyId: company.id, name: 'Employee', isSystem: true },
  })
  const pmRole = await prisma.projectRole.create({
    data: { companyId: company.id, name: 'Project Manager', isSystem: true },
  })
  const verifierRole = await prisma.projectRole.create({
    data: { companyId: company.id, name: 'Verifier', isSystem: false },
  })

  // Create projects (scoped to the company; Plan A allows up to 3)
  const projects = await Promise.all([
    prisma.project.create({ data: { companyId: company.id, name: 'Project Alpha', code: 'ALPHA', description: 'Core platform development', color: '#6366f1' } }),
    prisma.project.create({ data: { companyId: company.id, name: 'Project Beta', code: 'BETA', description: 'Mobile app development', color: '#0ea5e9' } }),
    prisma.project.create({ data: { companyId: company.id, name: 'Client Portal', code: 'PORTAL', description: 'Client-facing web portal', color: '#10b981' } }),
  ])

  // Project memberships: who's on which project with which role(s), and since when
  await prisma.projectMembership.create({
    data: {
      projectId: projects[0].id, userId: manager1.id, startDate: new Date('2023-03-01'),
      roles: { create: [{ roleId: pmRole.id }] },
    },
  })
  await prisma.projectMembership.create({
    data: {
      projectId: projects[0].id, userId: emp1.id, startDate: new Date('2023-06-01'),
      roles: { create: [{ roleId: employeeRole.id }] },
    },
  })
  await prisma.projectMembership.create({
    data: {
      projectId: projects[0].id, userId: emp2.id, startDate: new Date('2024-01-15'),
      // Riley holds two roles on this project: Employee and Verifier
      roles: { create: [{ roleId: employeeRole.id }, { roleId: verifierRole.id }] },
    },
  })
  await prisma.projectMembership.create({
    data: {
      projectId: projects[1].id, userId: manager2.id, startDate: new Date('2023-04-15'),
      roles: { create: [{ roleId: pmRole.id }] },
    },
  })
  await prisma.projectMembership.create({
    data: {
      projectId: projects[1].id, userId: emp3.id, startDate: new Date('2024-02-01'),
      roles: { create: [{ roleId: employeeRole.id }] },
    },
  })

  // Project Config for Project Alpha: weekends, hour config, entry types, holidays, workflow
  const alpha = projects[0]
  await prisma.project.update({
    where: { id: alpha.id },
    data: { standardDayHours: 8, minWeekHoursEnabled: true, minWeekHours: 40 },
  })
  await prisma.projectWeekend.createMany({
    data: [{ projectId: alpha.id, day: 'SAT' }, { projectId: alpha.id, day: 'SUN' }],
  })

  // Locked system entry types (every project gets these automatically)
  await prisma.entryType.createMany({
    data: [
      { projectId: alpha.id, name: 'Standard Hours', shortCode: 'STD', isSystem: true, systemType: 'STANDARD' },
      { projectId: alpha.id, name: 'Overtime Hours', shortCode: 'OT', isSystem: true, systemType: 'OVERTIME' },
      { projectId: alpha.id, name: 'Weekend Hours', shortCode: 'WKND', isSystem: true, systemType: 'WEEKEND' },
      { projectId: alpha.id, name: 'Holiday Hours', shortCode: 'HOL', isSystem: true, systemType: 'HOLIDAY' },
    ],
  })
  // Custom entry types the Company Admin added
  await prisma.entryType.createMany({
    data: [
      { projectId: alpha.id, name: 'Sick Leave', shortCode: 'SICK', isSystem: false },
      { projectId: alpha.id, name: 'Personal Leave', shortCode: 'PL', isSystem: false },
      { projectId: alpha.id, name: 'Travel for Work', shortCode: 'TRAVEL', isSystem: false },
    ],
  })

  await prisma.holiday.createMany({
    data: [
      { projectId: alpha.id, date: new Date('2026-01-26'), details: 'Republic Day', isRecurring: true },
      { projectId: alpha.id, date: new Date('2026-12-25'), details: 'Christmas', isRecurring: true },
    ],
  })

  // Default approval workflow: Employee -> Project Manager -> Closed
  const defaultWorkflow = await prisma.approvalWorkflow.create({
    data: { projectId: alpha.id, type: 'DEFAULT' },
  })
  await prisma.workflowStage.createMany({
    data: [
      { workflowId: defaultWorkflow.id, order: 1, roleId: pmRole.id, isTerminal: false },
      { workflowId: defaultWorkflow.id, order: 2, roleId: null, isTerminal: true },
    ],
  })
  // Overtime hours get an extra Verifier stage before the Project Manager
  const overtimeWorkflow = await prisma.approvalWorkflow.create({
    data: { projectId: alpha.id, type: 'OVERTIME' },
  })
  await prisma.workflowStage.createMany({
    data: [
      { workflowId: overtimeWorkflow.id, order: 1, roleId: verifierRole.id, isTerminal: false },
      { workflowId: overtimeWorkflow.id, order: 2, roleId: pmRole.id, isTerminal: false },
      { workflowId: overtimeWorkflow.id, order: 3, roleId: null, isTerminal: true },
    ],
  })

  // A few activity log entries per user (login history etc.)
  for (const u of [admin, manager1, manager2, emp1, emp2, emp3]) {
    await prisma.userActivityLog.create({
      data: { userId: u.id, action: 'LOGIN', detail: 'Signed in' },
    })
    await prisma.user.update({ where: { id: u.id }, data: { lastLoginAt: new Date() } })
  }
  const employees = [emp1, emp2, emp3, manager1]
  const now = new Date()

  for (const employee of employees) {
    for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
      const weekDate = subWeeks(now, weekOffset)
      const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 })

      const status = weekOffset === 0
        ? TimesheetStatus.DRAFT
        : weekOffset === 1
          ? TimesheetStatus.SUBMITTED
          : weekOffset === 2
            ? TimesheetStatus.REVERTED
            : TimesheetStatus.APPROVED

      // Default workflow on Project Alpha is Employee -> Project Manager (order 1) ->
      // Closed (order 2, terminal). Reflect where each seeded week sits in that flow.
      const currentStageOrder =
        status === TimesheetStatus.SUBMITTED ? 1 :
        status === TimesheetStatus.APPROVED ? 2 : 0

      const timesheet = await prisma.timesheet.create({
        data: {
          userId: employee.id,
          weekStart,
          weekEnd,
          status,
          totalHours: 40,
          submittedAt: weekOffset > 0 ? addDays(weekEnd, 1) : null,
          reviewedAt: weekOffset > 1 ? addDays(weekEnd, 2) : null,
          reviewedBy: weekOffset > 1 ? manager1.id : null,
          reviewNotes: status === TimesheetStatus.REVERTED ? 'Hours for Wednesday look off — please double-check and resubmit.' : null,
          projectId: weekOffset > 0 ? projects[0].id : null,
          workflowType: 'DEFAULT',
          currentStageOrder,
        },
      })

      if (status === TimesheetStatus.REVERTED) {
        await prisma.approvalAction.create({
          data: {
            timesheetId: timesheet.id, stageOrder: 1, actorId: manager1.id, action: 'REVERT',
            comments: 'Hours for Wednesday look off — please double-check and resubmit.',
          },
        })
      } else if (status === TimesheetStatus.APPROVED) {
        await prisma.approvalAction.create({
          data: { timesheetId: timesheet.id, stageOrder: 1, actorId: manager1.id, action: 'APPROVE', comments: 'Looks good.' },
        })
      }

      // Create 5 days of entries. One day (Wednesday) for Project Alpha logs 10
      // hours to demonstrate the auto overtime-split rule (Standard capped at 8,
      // 2 hours auto-moved to a system-generated Overtime entry — see
      // src/lib/timesheet-rules.ts, applied for real when these are saved via the UI).
      const alphaStandardType = await prisma.entryType.findFirst({
        where: { projectId: alpha.id, systemType: 'STANDARD' },
      })

      for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
        const entryDate = addDays(weekStart, dayOffset)
        const project = projects[dayOffset % projects.length]
        const isDemoOvertimeDay = weekOffset === 3 && dayOffset === 0 && project.id === alpha.id

        await prisma.timesheetEntry.create({
          data: {
            timesheetId: timesheet.id,
            projectId: project.id,
            date: entryDate,
            hours: 8,
            description: `Working on ${project.name}`,
            isBillable: true,
            entryTypeId: project.id === alpha.id ? alphaStandardType?.id : undefined,
          },
        })

        if (isDemoOvertimeDay) {
          const overtimeType = await prisma.entryType.findFirst({ where: { projectId: alpha.id, systemType: 'OVERTIME' } })
          if (overtimeType) {
            await prisma.timesheetEntry.create({
              data: {
                timesheetId: timesheet.id,
                projectId: alpha.id,
                date: entryDate,
                hours: 2,
                description: 'Auto-calculated: hours beyond standard day hours',
                isBillable: true,
                entryTypeId: overtimeType.id,
                isAutoGenerated: true,
              },
            })
            await prisma.timesheet.update({
              where: { id: timesheet.id },
              data: { totalHours: { increment: 2 } },
            })
          }
        }
      }
    }
  }

  console.log('✅ Seed complete!')
  console.log('\n📋 Test accounts (company: timepro-demo, on Plan A / monthly):')
  console.log('  Admin:    admin@timepro.com    / password123')
  console.log('  Manager:  manager@timepro.com  / password123')
  console.log('  Employee: jordan@timepro.com   / password123')
  console.log('\n🛡️  Super admin (platform-level, no company):')
  console.log('  superadmin@timepro.com / password123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
