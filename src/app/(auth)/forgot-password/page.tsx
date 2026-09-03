'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Clock, Building2, Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, email }),
      })
      const data = await res.json()
      setSent(true)
      setDevResetUrl(data.devResetUrl ?? null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-6">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg">TimeSheet Pro</span>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          {!sent ? (
            <>
              <h2 className="text-lg font-bold text-white mb-1">Forgot your password?</h2>
              <p className="text-gray-400 text-sm mb-6">Enter your company and email — we&apos;ll send you a reset link.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Company</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text" required value={company} onChange={e => setCompany(e.target.value.trim().toLowerCase())}
                      placeholder="your-company"
                      className="w-full pl-10 pr-4 py-3 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder:text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full pl-10 pr-4 py-3 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder:text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-all active:scale-[0.98]"
                >
                  {loading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <>Send reset link <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-white mb-1">Check your email</h2>
              <p className="text-gray-400 text-sm">If an account matches those details, a reset link is on its way.</p>
              {devResetUrl && (
                <div className="mt-4 p-3 bg-amber-950/40 border border-amber-900 rounded-xl text-left">
                  <p className="text-amber-400 text-xs font-semibold mb-1">No email provider configured yet — dev link:</p>
                  <Link href={devResetUrl.replace(/^.*(?=\/reset-password)/, '')} className="text-xs text-amber-300 break-all underline">
                    {devResetUrl}
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
