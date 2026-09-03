import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SuperAdminNav } from '@/components/superadmin/SuperAdminNav'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user.isSuperAdmin) redirect('/superadmin/login')

  return (
    <div className="min-h-screen bg-gray-950">
      <SuperAdminNav name={session.user.name ?? 'SuperAdmin'} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
