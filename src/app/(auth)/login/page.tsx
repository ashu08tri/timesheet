'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Clock, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

const DEMO_ACCOUNTS = [
  { label: 'Admin',    email: 'admin@timepro.com',   role: 'Full access' },
  { label: 'Manager',  email: 'manager@timepro.com', role: 'Approve timesheets' },
  { label: 'Employee', email: 'jordan@timepro.com',  role: 'Submit timesheets' },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.error) {
      setError('Invalid email or password. Try the demo accounts below.')
    } else {
      toast.success('Welcome back!')
      router.push('/dashboard')
      router.refresh()
    }
  }

  function quickLogin(demoEmail: string) {
    setEmail(demoEmail)
    setPassword('password123')
  }

  return (
    <div className="min-h-screen flex bg-gray-950">
      {/* Left panel — branding */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 
                   bg-gradient-to-br from-brand-950 via-brand-900 to-indigo-950 
                   p-12 relative overflow-hidden"
      >
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-brand-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 -left-20 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">TimeSheet Pro</span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Track time.<br />
            <span className="text-brand-300">Stay accountable.</span>
          </h1>
          <p className="text-indigo-300 text-lg leading-relaxed">
            Effortless time tracking and approval workflows for modern project-driven teams.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative space-y-4">
          {[
            { icon: '⏱', text: 'Daily timesheet entry by project' },
            { icon: '✅', text: 'Submit & approval workflow' },
            { icon: '📊', text: 'Weekly & monthly analytics' },
            { icon: '👥', text: 'Multi-role: Employee, Manager, Admin' },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex items-center gap-3 text-indigo-200"
            >
              <span className="text-lg">{f.icon}</span>
              <span className="text-sm">{f.text}</span>
            </motion.div>
          ))}
        </div>

        <p className="relative text-indigo-400 text-xs">
          © {new Date().getFullYear()} TimeSheet Pro. Open source & self-hosted.
        </p>
      </motion.div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg">TimeSheet Pro</span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">Sign in</h2>
          <p className="text-gray-400 text-sm mb-8">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl
                             text-white placeholder:text-gray-600 text-sm
                             focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                             transition-all"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-gray-900 border border-gray-700 rounded-xl
                             text-white placeholder:text-gray-600 text-sm
                             focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                             transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 bg-red-950 border border-red-800 rounded-xl text-red-300 text-sm"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 
                         hover:bg-brand-500 disabled:opacity-60 text-white font-semibold 
                         rounded-xl transition-all duration-150 active:scale-[0.98] shadow-lg
                         shadow-brand-900/50 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign in <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-8">
            <div className="relative flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-gray-500 text-xs font-medium">Demo accounts</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map(account => (
                <motion.button
                  key={account.email}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => quickLogin(account.email)}
                  className="p-3 bg-gray-900 hover:bg-gray-800 border border-gray-700 
                             hover:border-brand-700 rounded-xl text-left transition-all"
                >
                  <div className="text-xs font-bold text-white mb-0.5">{account.label}</div>
                  <div className="text-xs text-gray-500 leading-tight">{account.role}</div>
                </motion.button>
              ))}
            </div>
            <p className="text-center text-gray-600 text-xs mt-3">
              All demo accounts use password: <code className="text-gray-500">password123</code>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
