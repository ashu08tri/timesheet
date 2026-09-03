'use client'
import { signOut } from 'next-auth/react'
import { ShieldCheck, LogOut } from 'lucide-react'

export function SuperAdminNav({ name }: { name: string }) {
  return (
    <header className="border-b border-gray-900 bg-black">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-black" />
          </div>
          <span className="text-white font-bold text-sm">Platform Control Panel</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-xs">{name}</span>
          <button
            onClick={() => signOut({ callbackUrl: '/superadmin/login' })}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
