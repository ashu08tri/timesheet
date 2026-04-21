'use client'
import { useSession } from 'next-auth/react'
import { Bell } from 'lucide-react'
import { format } from 'date-fns'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { data: session } = useSession()

  return (
    <header className="flex items-center justify-between mb-6 pt-1">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
          <span>{format(new Date(), 'EEEE, MMM d yyyy')}</span>
        </div>
      </div>
    </header>
  )
}
