'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, TrendingUp, CheckCircle2, AlertCircle, Calendar } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { StatsCard } from '@/components/ui/StatsCard'
import { WeeklyBarChart, ProjectPieChart } from '@/components/dashboard/Charts'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { Header } from '@/components/layout/Header'
import { format } from 'date-fns'
import Link from 'next/link'

interface DashboardData {
  totalHoursThisWeek: number
  totalHoursThisMonth: number
  pendingApprovals: number
  approvedThisMonth: number
  weeklyData: { week: string; hours: number }[]
  projectBreakdown: { name: string; hours: number; color: string }[]
  statusCounts: Record<string, number>
}

interface RecentTimesheet {
  id: string
  weekStart: string
  status: string
  totalHours: number
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
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

export default function DashboardPage() {
  const { data: session } = useSession()
  const [stats, setStats]     = useState<DashboardData | null>(null)
  const [recent, setRecent]   = useState<RecentTimesheet[]>([])
  const [loading, setLoading] = useState(true)
  // greeting set client-side only to avoid SSR/hydration time mismatch
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    setGreeting(getGreeting())
  }, [])

  useEffect(() => {
    async function load() {
      const [statsData, recentData] = await Promise.all([
        safeFetchJson<DashboardData>('/api/dashboard'),
        safeFetchJson<RecentTimesheet[]>('/api/timesheets'),
      ])
      if (statsData) setStats(statsData)
      if (Array.isArray(recentData)) setRecent(recentData.slice(0, 5))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <PageLoader />

  const isManager = ['MANAGER', 'ADMIN'].includes(session?.user?.role ?? '')

  return (
    <>
      <Header
        title={
          greeting
            ? `Good ${greeting}, ${session?.user?.name?.split(' ')[0] ?? ''} ${String.fromCodePoint(0x1F44B)}`
            : `Welcome, ${session?.user?.name?.split(' ')[0] ?? ''} ${String.fromCodePoint(0x1F44B)}`
        }
        subtitle="Here's your time tracking overview"
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          index={0}
          title="This week"
          value={`${stats?.totalHoursThisWeek ?? 0}h`}
          subtitle="of 40h target"
          icon={Clock}
          iconColor="text-brand-600"
          iconBg="bg-brand-50 dark:bg-brand-950"
        />
        <StatsCard
          index={1}
          title="This month"
          value={`${stats?.totalHoursThisMonth ?? 0}h`}
          subtitle="total logged"
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50 dark:bg-emerald-950"
        />
        <StatsCard
          index={2}
          title="Approved"
          value={stats?.approvedThisMonth ?? 0}
          subtitle="timesheets this month"
          icon={CheckCircle2}
          iconColor="text-teal-600"
          iconBg="bg-teal-50 dark:bg-teal-950"
        />
        {isManager ? (
          <StatsCard
            index={3}
            title="Pending review"
            value={stats?.pendingApprovals ?? 0}
            subtitle="awaiting approval"
            icon={AlertCircle}
            iconColor="text-amber-600"
            iconBg="bg-amber-50 dark:bg-amber-950"
          />
        ) : (
          <StatsCard
            index={3}
            title="Drafts"
            value={stats?.statusCounts?.DRAFT ?? 0}
            subtitle="not yet submitted"
            icon={Calendar}
            iconColor="text-purple-600"
            iconBg="bg-purple-50 dark:bg-purple-950"
          />
        )}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <WeeklyBarChart data={stats?.weeklyData ?? []} />
        <ProjectPieChart data={stats?.projectBreakdown ?? []} />
      </div>

      {/* Recent timesheets */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Recent timesheets</h3>
            <p className="text-xs text-gray-400">Your latest submissions</p>
          </div>
          <Link href="/timesheets" className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium">
            View all
          </Link>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {recent.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No timesheets yet</p>
          ) : (
            recent.map((ts, i) => (
              <motion.div
                key={ts.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + i * 0.05 }}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Week of {format(new Date(ts.weekStart), 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-gray-400">{ts.totalHours}h logged</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={ts.status} size="sm" />
                  <Link
                    href="/timesheets"
                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    View
                  </Link>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Quick action banner for managers with pending approvals */}
      {isManager && (stats?.pendingApprovals ?? 0) > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                {stats?.pendingApprovals} timesheet{stats?.pendingApprovals !== 1 ? 's' : ''} awaiting your review
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Review and approve your team&apos;s submitted timesheets
              </p>
            </div>
          </div>
          <Link href="/approvals" className="btn-primary text-xs shrink-0">
            Review now
          </Link>
        </motion.div>
      )}
    </>
  )
}
