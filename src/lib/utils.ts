import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function getWeekDates(date: Date = new Date()) {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end = endOfWeek(date, { weekStartsOn: 1 })
  return { start, end }
}

export function getWeekDays(weekStart: Date) {
  return eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 4), // Mon-Fri
  })
}

export function formatWeekLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6)
  const startStr = format(weekStart, 'MMM d')
  const endStr = format(weekEnd, 'MMM d, yyyy')
  return `${startStr} – ${endStr}`
}

export function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    DRAFT:     'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    IN_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    APPROVED:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    REJECTED:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  }
  return colors[status] ?? colors.DRAFT
}

export function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT:     'Draft',
    SUBMITTED: 'Submitted',
    IN_REVIEW: 'In Review',
    APPROVED:  'Approved',
    REJECTED:  'Rejected',
  }
  return labels[status] ?? status
}

export function getRoleColor(role: string) {
  const colors: Record<string, string> = {
    EMPLOYEE: 'bg-purple-100 text-purple-700',
    MANAGER:  'bg-teal-100 text-teal-700',
    ADMIN:    'bg-amber-100 text-amber-700',
  }
  return colors[role] ?? ''
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
