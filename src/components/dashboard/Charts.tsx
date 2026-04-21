'use client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { motion } from 'framer-motion'

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