'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Clock, Building2, User, AtSign, Lock, ArrowRight, AlertCircle, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface Plan {
  id: string
  name: string
  maxProjects: number
  maxUsers: number
  monthlyPrice: number
  annualPrice: number
}

export default function SignupPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [planId, setPlanId] = useState('')
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY')

  const [companyName, setCompanyName] = useState('')
  const [slug, setSlug] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminUsername, setAdminUsername] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/plans')
      .then(res => res.json())
      .then((data: Plan[]) => {
        setPlans(data)
        if (data.length) setPlanId(data[0].id)
      })
  }, [])

  function handleCompanyNameChange(value: string) {
    setCompanyName(value)
    setSlug(value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/companies/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName, slug, planId, billingCycle,
        adminName, adminUsername, adminEmail, password,
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      return
    }

    toast.success('Company created! Sign in to get started.')
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg">TimeSheet Pro</span>
        </div>

        <h2 className="text-2xl font-bold text-white mb-1 text-center">Subscribe your company</h2>
        <p className="text-gray-400 text-sm mb-8 text-center">Pick a plan and set up your company workspace</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Plan selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Choose a plan
            </label>
            <div className="grid sm:grid-cols-3 gap-3">
              {plans.map(plan => (
                <button
                  type="button"
                  key={plan.id}
                  onClick={() => setPlanId(plan.id)}
                  className={`relative text-left p-4 rounded-xl border transition-all ${
                    planId === plan.id
                      ? 'border-brand-500 bg-brand-950/40 ring-1 ring-brand-500'
                      : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                  }`}
                >
                  {planId === plan.id && (
                    <div className="absolute top-3 right-3 w-4 h-4 bg-brand-500 rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  <div className="text-white font-bold text-sm mb-1">{plan.name}</div>
                  <div className="text-gray-400 text-xs mb-2">
                    Up to {plan.maxProjects} project{plan.maxProjects === 1 ? '' : 's'}, {plan.maxUsers} users
                  </div>
                  <div className="text-brand-300 text-sm font-semibold">
                    {plan.monthlyPrice === 0 ? 'Free' : `$${plan.monthlyPrice}/mo`}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Billing cycle */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Billing cycle
            </label>
            <div className="flex gap-2">
              {(['MONTHLY', 'ANNUAL'] as const).map(cycle => (
                <button
                  type="button"
                  key={cycle}
                  onClick={() => setBillingCycle(cycle)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    billingCycle === cycle
                      ? 'border-brand-500 bg-brand-950/40 text-brand-300'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {cycle === 'MONTHLY' ? 'Monthly' : 'Annual (2 months free)'}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-gray-800" />

          {/* Company details */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Company name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text" required value={companyName}
                  onChange={e => handleCompanyNameChange(e.target.value)}
                  placeholder="Acme Corp"
                  className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder:text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Company ID (used to sign in)
              </label>
              <input
                type="text" required value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="acme-corp"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder:text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Admin details */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Your name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text" required value={adminName} onChange={e => setAdminName(e.target.value)}
                  placeholder="Alex Admin"
                  className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder:text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text" required value={adminUsername} onChange={e => setAdminUsername(e.target.value)}
                  placeholder="alex.admin"
                  className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder:text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Email 
              </label>
              <input
                type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)}
                placeholder="alex@acme.com"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder:text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder:text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-950 border border-red-800 rounded-xl text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !planId}
            className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-all active:scale-[0.98]"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>Create company &amp; start free trial <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Already have a company?{' '}
          <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
