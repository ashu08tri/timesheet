'use client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine,
} from 'recharts'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface WeeklyBarChartProps {
  data: { week: string; hours: number }[]
}

export function WeeklyBarChart({ data }: WeeklyBarChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Weekly hours</h3>
          <p className="text-xs text-gray-400">Last 8 weeks</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full bg-brand-500 inline-block" />
          Hours logged
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barSize={28} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fill: 'var(--chart-text, #9ca3af)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--chart-text, #9ca3af)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: '#1f2937',
              border: 'none',
              borderRadius: 12,
              fontSize: 12,
              color: '#f9fafb',
              padding: '8px 12px',
            }}
            formatter={(v: number) => [`${v}h`, 'Hours']}
            cursor={{ fill: 'rgba(99,102,241,0.08)', radius: 8 }}
          />
          <Bar dataKey="hours" fill="#6366f1" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

interface ProjectPieChartProps {
  data: { name: string; hours: number; color: string }[]
}

export function ProjectPieChart({ data }: ProjectPieChartProps) {
  const total = data.reduce((s, d) => s + d.hours, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="card p-5"
    >
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Project breakdown</h3>
        <p className="text-xs text-gray-400">This month</p>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] text-sm text-gray-400">
          No data yet
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <ResponsiveContainer width={140} height={140}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                paddingAngle={2}
                dataKey="hours"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#1f2937',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 11,
                  color: '#f9fafb',
                }}
                formatter={(v: number) => [`${v}h`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-2 min-w-0">
            {data.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">{item.name}</span>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 tabular-nums">{item.hours}h</span>
                <span className="text-xs text-gray-400 tabular-nums w-8 text-right">
                  {total > 0 ? Math.round((item.hours / total) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

interface OverviewBar {
  label: string
  date: string
  standard: number
  overtime: number
  weekend: number
  holiday: number
  custom: number
  status: string | null
  standardCap: number
}

const ENTRY_TYPE_KEYS = [
  { key: 'standard', label: 'Standard', color: '#6366f1' },
  { key: 'overtime', label: 'Overtime', color: '#f59e0b' },
  { key: 'weekend',  label: 'Weekend',  color: '#0ea5e9' },
  { key: 'holiday',  label: 'Holiday',  color: '#10b981' },
  { key: 'custom',   label: 'Other',    color: '#a855f7' },
] as const

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#9ca3af', SUBMITTED: '#3b82f6', IN_REVIEW: '#f59e0b', APPROVED: '#10b981', REVERTED: '#ef4444',
}

/**
 * The doc's "Timesheet Overview" bar chart: each bar carries two layers of
 * information — hours broken down by entry type, and (via bar color when the
 * Status layer is selected) the timesheet's approval status. Toggle between Day
 * view (up to 30 bars) and Week view (up to 52 bars), and between the two layers.
 * A reference line marks the project's standard hours so gaps below it are visible.
 */
export function TimesheetOverviewChart() {
  const [view, setView] = useState<'day' | 'week'>('day')
  const [layer, setLayer] = useState<'type' | 'status'>('type')
  const [data, setData] = useState<OverviewBar[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/dashboard/overview?view=${view}`)
      .then(res => res.json())
      .then(json => setData(json.data ?? []))
      .finally(() => setLoading(false))
  }, [view])

  const avgCap = data.length ? data[0].standardCap : 8

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="card p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Timesheet Overview</h3>
          <p className="text-xs text-gray-400">
            {view === 'day' ? 'Last 30 days' : 'Last 52 weeks'} · showing hours by {layer === 'type' ? 'entry type' : 'status'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {(['day', 'week'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={cn('px-2.5 py-1 rounded-md text-[11px] font-semibold', view === v ? 'bg-white dark:bg-gray-900 shadow-sm text-brand-600' : 'text-gray-400')}>
                {v === 'day' ? 'Days' : 'Weeks'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {(['type', 'status'] as const).map(l => (
              <button key={l} onClick={() => setLayer(l)}
                className={cn('px-2.5 py-1 rounded-md text-[11px] font-semibold', layer === l ? 'bg-white dark:bg-gray-900 shadow-sm text-brand-600' : 'text-gray-400')}>
                {l === 'type' ? 'By type' : 'By status'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">Loading…</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} barSize={view === 'day' ? 14 : 10} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
              interval={view === 'day' ? 4 : Math.max(Math.floor(data.length / 10), 0)} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 12, fontSize: 12, color: '#f9fafb', padding: '8px 12px' }}
              formatter={(v: number, name: string) => [`${v}h`, name]}
              cursor={{ fill: 'rgba(99,102,241,0.08)', radius: 8 }}
            />
            <ReferenceLine y={avgCap} stroke="#d1d5db" strokeDasharray="4 4" label={{ value: `${avgCap}h standard`, fontSize: 10, fill: '#9ca3af', position: 'right' }} />
            {layer === 'type' ? (
              ENTRY_TYPE_KEYS.map(t => (
                <Bar key={t.key} dataKey={t.key} name={t.label} stackId="hours" fill={t.color} radius={t.key === 'custom' ? [4, 4, 0, 0] : undefined} />
              ))
            ) : (
              <Bar dataKey={(d: OverviewBar) => d.standard + d.overtime + d.weekend + d.holiday + d.custom} name="Hours" radius={[4, 4, 0, 0]}>
                {data.map((d, i) => <Cell key={i} fill={d.status ? STATUS_COLORS[d.status] ?? '#e5e7eb' : '#e5e7eb'} />)}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      )}

      <div className="flex flex-wrap gap-3 mt-3">
        {(layer === 'type' ? ENTRY_TYPE_KEYS.map(t => ({ label: t.label, color: t.color }))
          : Object.entries(STATUS_COLORS).map(([label, color]) => ({ label, color }))
        ).map(item => (
          <div key={item.label} className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
            {item.label}
          </div>
        ))}
      </div>
    </motion.div>
  )
}