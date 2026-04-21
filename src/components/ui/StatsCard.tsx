'use client'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  trend?: { value: number; label: string }
  index?: number
}

export function StatsCard({
  title, value, subtitle, icon: Icon,
  iconColor = 'text-brand-600',
  iconBg   = 'bg-brand-50 dark:bg-brand-950',
  trend, index = 0,
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4, ease: 'easeOut' }}
      className="card p-5 flex items-start gap-4 hover:shadow-md transition-shadow"
    >
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
        <Icon className={cn('w-5 h-5', iconColor)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">
          {title}
        </p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        )}
        {trend && (
          <div className={cn(
            'inline-flex items-center gap-1 text-xs font-semibold mt-1 px-1.5 py-0.5 rounded',
            trend.value >= 0
              ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40'
              : 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950/40'
          )}>
            {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value)}% {trend.label}
          </div>
        )}
      </div>
    </motion.div>
  )
}
