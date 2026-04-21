'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { Header } from '@/components/layout/Header'
import { WeeklyBarChart, ProjectPieChart } from '@/components/dashboard/Charts'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatHours } from '@/lib/utils'

interface TimesheetEntry {
  hours: number
  isBillable: boolean
  project: { name: string; color: string }
}

interface Timesheet {
  id: string
  weekStart: string
  status: string
  totalHours: number
  user: { name: string; department: string | null }
  entries: TimesheetEntry[]
}

interface DashboardStats {
  weeklyData: { week: string; hours: number }[]
  projectBreakdown: { name: string; hours: number; color: string }[]
}

async function safeFetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const text = await res.text()
    if (!text) return null
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export default function ReportsPage() {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [stats, setStats]           = useState<DashboardStats | null>(null)
  const [loading, setLoading]       = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date())

  useEffect(() => {
    async function load() {
      const [tsData, statsData] = await Promise.all([
        safeFetchJson<Timesheet[]>('/api/timesheets?team=true'),
        safeFetchJson<DashboardStats>('/api/dashboard'),
      ])
      setTimesheets(Array.isArray(tsData) ? tsData : [])
      if (statsData) setStats(statsData)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <PageLoader />

  const monthStart = startOfMonth(selectedMonth)
  const monthEnd   = endOfMonth(selectedMonth)

  const monthTs = timesheets.filter(t => {
    const d = new Date(t.weekStart)
    return d >= monthStart && d <= monthEnd
  })

  const totalHours    = monthTs.reduce((s, t) => s + t.totalHours, 0)
  const allEntries    = monthTs.flatMap(t => t.entries)
  const billableHours = allEntries.filter(e => e.isBillable).reduce((s, e) => s + e.hours, 0)

  // User summary table
  const userMap = new Map<string, { name: string; hours: number; dept: string | null }>()
  for (const ts of monthTs) {
    const existing = userMap.get(ts.user.name)
    if (existing) {
      existing.hours += ts.totalHours
    } else {
      userMap.set(ts.user.name, {
        name:  ts.user.name,
        hours: ts.totalHours,
        dept:  ts.user.department,
      })
    }
  }
  const userSummary = Array.from(userMap.values()).sort((a, b) => b.hours - a.hours)

  const summaryCards = [
    {
      label: 'Total hours',
      value: `${totalHours}h`,
      sub:   format(selectedMonth, 'MMMM yyyy'),
      color: 'text-brand-600',
    },
    {
      label: 'Billable hours',
      value: `${billableHours}h`,
      sub:   totalHours > 0 ? `${Math.round((billableHours / totalHours) * 100)}% of total` : '0% of total',
      color: 'text-emerald-600',
    },
    {
      label: 'Timesheets',
      value: String(monthTs.length),
      sub:   `${monthTs.filter(t => t.status === 'APPROVED').length} approved`,
      color: 'text-teal-600',
    },
    {
      label: 'Team members',
      value: String(userSummary.length),
      sub:   'with logged time',
      color: 'text-purple-600',
    },
  ]

  return (
    <>
      <Header
        title="Reports"
        subtitle="Time tracking analytics and summaries"
        actions={
          <select
            value={format(selectedMonth, 'yyyy-MM')}
            onChange={e => setSelectedMonth(new Date(`${e.target.value}-01`))}
            className="input text-sm py-2 w-36"
          >
            {Array.from({ length: 12 }, (_, i) => {
              const d = subMonths(new Date(), i)
              return (
                <option key={i} value={format(d, 'yyyy-MM')}>
                  {format(d, 'MMM yyyy')}
                </option>
              )
            })}
          </select>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {summaryCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="card p-5"
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              {card.label}
            </p>
            <p className={`text-2xl font-bold tabular-nums ${card.color}`}>{card.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <WeeklyBarChart data={stats?.weeklyData ?? []} />
        <ProjectPieChart data={stats?.projectBreakdown ?? []} />
      </div>

      {/* Team breakdown table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card overflow-hidden"
      >
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Team breakdown</h3>
          <p className="text-xs text-gray-400">{format(selectedMonth, 'MMMM yyyy')}</p>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {userSummary.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No data for this month</p>
          ) : (
            userSummary.map((user, i) => (
              <motion.div
                key={user.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 + i * 0.04 }}
                className="flex items-center gap-4 px-5 py-3"
              >
                <div className="w-8 h-8 bg-brand-100 dark:bg-brand-900 rounded-lg flex items-center justify-center text-xs font-bold text-brand-700 dark:text-brand-300 shrink-0">
                  {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                  {user.dept && <p className="text-xs text-gray-400">{user.dept}</p>}
                </div>
                {/* Progress bar — 160h = full month */}
                <div className="flex-1 max-w-[120px] hidden sm:block">
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                    <div
                      className="bg-brand-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min((user.hours / 160) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums shrink-0">
                  {formatHours(user.hours)}
                </p>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </>
  )
}
