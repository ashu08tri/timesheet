'use client'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { format, addWeeks, subWeeks, isThisWeek } from 'date-fns'
import { motion } from 'framer-motion'

interface WeekNavigatorProps {
  weekStart: Date
  onChange: (date: Date) => void
}

export function WeekNavigator({ weekStart, onChange }: WeekNavigatorProps) {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(subWeeks(weekStart, 1))}
        className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="Previous week"
      >
        <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </button>

      <motion.div
        key={weekStart.toISOString()}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 
                   border border-gray-200 dark:border-gray-700 rounded-xl min-w-[220px] justify-center"
      >
        <CalendarDays className="w-4 h-4 text-brand-500" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
        </span>
        {isThisWeek(weekStart, { weekStartsOn: 1 }) && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 rounded-full">
            This week
          </span>
        )}
      </motion.div>

      <button
        onClick={() => onChange(addWeeks(weekStart, 1))}
        className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="Next week"
      >
        <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </button>

      {!isThisWeek(weekStart, { weekStartsOn: 1 }) && (
        <button
          onClick={() => onChange(new Date())}
          className="text-xs px-3 py-2 text-brand-600 dark:text-brand-400 
                     hover:bg-brand-50 dark:hover:bg-brand-950 rounded-xl transition-colors font-medium"
        >
          Today
        </button>
      )}
    </div>
  )
}
