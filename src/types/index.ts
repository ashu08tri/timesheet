import { Role, TimesheetStatus } from '@prisma/client'
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: string
      department?: string | null
    }
  }
}

export type { Role, TimesheetStatus }

export interface UserSummary {
  id: string
  name: string
  email: string
  role: Role
  department: string | null
  avatarUrl: string | null
}

export interface ProjectSummary {
  id: string
  name: string
  code: string
  color: string
}

export interface TimesheetEntryForm {
  projectId: string
  date: string
  hours: number
  description: string
  isBillable: boolean
}

export interface TimesheetWithEntries {
  id: string
  userId: string
  weekStart: Date
  weekEnd: Date
  status: TimesheetStatus
  totalHours: number
  notes: string | null
  submittedAt: Date | null
  reviewedAt: Date | null
  reviewNotes: string | null
  user: UserSummary
  entries: Array<{
    id: string
    projectId: string
    date: Date
    hours: number
    description: string | null
    isBillable: boolean
    project: ProjectSummary
  }>
  reviewer?: UserSummary | null
}

export interface DashboardStats {
  totalHoursThisWeek: number
  totalHoursThisMonth: number
  pendingApprovals: number
  approvedThisMonth: number
  weeklyData: { week: string; hours: number }[]
  projectBreakdown: { name: string; hours: number; color: string }[]
}
