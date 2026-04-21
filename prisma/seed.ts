import { PrismaClient, Role, TimesheetStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { startOfWeek, endOfWeek, addDays, subWeeks } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clean up
  await prisma.timesheetEntry.deleteMany()
  await prisma.timesheet.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()

  const password = await bcrypt.hash('password123', 10)

  // Create admin
  const admin = await prisma.user.create({
    data: {
      name: 'Alex Admin',
      email: 'admin@timepro.com',
      password,
      role: Role.ADMIN,
      department: 'Operations',
    },
  })

  // Create managers
  const manager1 = await prisma.user.create({
    data: {
      name: 'Morgan Manager',
      email: 'manager@timepro.com',
      password,
      role: Role.MANAGER,
      department: 'Engineering',
    },
  })

  const manager2 = await prisma.user.create({
    data: {
      name: 'Sam Supervisor',
      email: 'sam@timepro.com',
      password,
      role: Role.MANAGER,
      department: 'Design',
    },
  })

  // Create employees
  const emp1 = await prisma.user.create({
    data: {
      name: 'Jordan Developer',
      email: 'jordan@timepro.com',
      password,
      role: Role.EMPLOYEE,
      department: 'Engineering',
      managerId: manager1.id,
    },
  })

  const emp2 = await prisma.user.create({
    data: {
      name: 'Riley Engineer',
      email: 'riley@timepro.com',
      password,
      role: Role.EMPLOYEE,
      department: 'Engineering',
      managerId: manager1.id,
    },
  })

  const emp3 = await prisma.user.create({
    data: {
      name: 'Casey Designer',
      email: 'casey@timepro.com',
      password,
      role: Role.EMPLOYEE,
      department: 'Design',
      managerId: manager2.id,
    },
  })

  // Create projects
  const projects = await Promise.all([
    prisma.project.create({ data: { name: 'Project Alpha', code: 'ALPHA', description: 'Core platform development', color: '#6366f1' } }),
    prisma.project.create({ data: { name: 'Project Beta', code: 'BETA', description: 'Mobile app development', color: '#0ea5e9' } }),
    prisma.project.create({ data: { name: 'Client Portal', code: 'PORTAL', description: 'Client-facing web portal', color: '#10b981' } }),
    prisma.project.create({ data: { name: 'Internal Tools', code: 'TOOLS', description: 'Internal productivity tools', color: '#f59e0b' } }),
    prisma.project.create({ data: { name: 'DevOps', code: 'DEVOPS', description: 'Infrastructure & CI/CD', color: '#ef4444' } }),
  ])

  // Create timesheets for multiple weeks
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
            ? TimesheetStatus.APPROVED
            : TimesheetStatus.APPROVED

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
        },
      })

      // Create 5 days of entries
      for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
        const entryDate = addDays(weekStart, dayOffset)
        const project = projects[dayOffset % projects.length]

        await prisma.timesheetEntry.create({
          data: {
            timesheetId: timesheet.id,
            projectId: project.id,
            date: entryDate,
            hours: 8,
            description: `Working on ${project.name}`,
            isBillable: true,
          },
        })
      }
    }
  }

  console.log('✅ Seed complete!')
  console.log('\n📋 Test accounts:')
  console.log('  Admin:    admin@timepro.com    / password123')
  console.log('  Manager:  manager@timepro.com  / password123')
  console.log('  Employee: jordan@timepro.com   / password123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
