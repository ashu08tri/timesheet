'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Clock, CheckSquare, BarChart2,
  LogOut, Users, ChevronRight, Menu, X,
} from 'lucide-react'
import { cn, getInitials, getRoleColor } from '@/lib/utils'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard, roles: ['EMPLOYEE','MANAGER','ADMIN'] },
  { href: '/timesheets', label: 'Timesheets', icon: Clock,            roles: ['EMPLOYEE','MANAGER','ADMIN'] },
  { href: '/approvals',  label: 'Approvals',  icon: CheckSquare,      roles: ['MANAGER','ADMIN'] },
  { href: '/reports',    label: 'Reports',    icon: BarChart2,        roles: ['MANAGER','ADMIN'] },
  { href: '/admin',      label: 'Admin',      icon: Users,            roles: ['ADMIN'] },
]

export function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const role = session?.user?.role ?? 'EMPLOYEE'
  const visibleItems = navItems.filter(item => item.roles.includes(role))

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-gray-100 dark:border-gray-800">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-sm">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 dark:text-white text-base tracking-tight">
            TimeSheet Pro
          </span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest px-3 py-2">
          Navigation
        </p>
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn('sidebar-link group', isActive && 'active')}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 opacity-50" />}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 mb-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300">
            {getInitials(session?.user?.name ?? 'U')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {session?.user?.name}
            </p>
            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', getRoleColor(role))}>
              {role}
            </span>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="sidebar-link w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden lg:flex flex-col w-[var(--sidebar-width)] shrink-0
                        bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
                        fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white dark:bg-gray-900
                   border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm"
      >
        <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed inset-y-0 left-0 w-72 z-50
                         bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}