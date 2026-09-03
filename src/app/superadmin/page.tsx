'use client'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Building2, CreditCard, Plus, Pencil, Ban, CheckCircle2, Users, FolderOpen } from 'lucide-react'
import toast from 'react-hot-toast'

interface Company {
  id: string; name: string; slug: string; isActive: boolean; createdAt: string
  subscription: {
    billingCycle: string; status: string; currentPeriodEnd: string
    plan: { id: string; name: string; maxProjects: number; maxUsers: number }
  } | null
  _count: { users: number; projects: number }
}
interface Plan {
  id: string; name: string; maxProjects: number; maxUsers: number
  monthlyPrice: number; annualPrice: number; isActive: boolean
  _count: { subscriptions: number }
}

const cardCls = 'bg-gray-900 border border-gray-800 rounded-2xl'
const inputCls = 'w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500'

export default function SuperAdminDashboard() {
  const [tab, setTab] = useState<'companies' | 'plans'>('companies')
  const [companies, setCompanies] = useState<Company[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const [cRes, pRes] = await Promise.all([fetch('/api/superadmin/companies'), fetch('/api/superadmin/plans')])
      if (cRes.ok) setCompanies(await cRes.json())
      if (pRes.ok) setPlans(await pRes.json())
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function toggleCompanyActive(company: Company) {
    const res = await fetch(`/api/superadmin/companies/${company.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !company.isActive }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? 'Failed to update company'); return }
    toast.success(company.isActive ? `${company.name} suspended` : `${company.name} reactivated`)
    load()
  }

  async function changePlan(company: Company, planId: string) {
    const res = await fetch(`/api/superadmin/companies/${company.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? 'Failed to change plan'); return }
    toast.success(`${company.name} moved to a new plan`)
    load()
  }

  const [planModal, setPlanModal] = useState<{ mode: 'add' | 'edit'; id?: string } | null>(null)
  const [planForm, setPlanForm] = useState({ name: '', maxProjects: 3, maxUsers: 30, monthlyPrice: 0, annualPrice: 0 })

  function openAddPlan() {
    setPlanForm({ name: '', maxProjects: 3, maxUsers: 30, monthlyPrice: 0, annualPrice: 0 })
    setPlanModal({ mode: 'add' })
  }
  function openEditPlan(p: Plan) {
    setPlanForm({ name: p.name, maxProjects: p.maxProjects, maxUsers: p.maxUsers, monthlyPrice: p.monthlyPrice, annualPrice: p.annualPrice })
    setPlanModal({ mode: 'edit', id: p.id })
  }
  async function savePlan(e: React.FormEvent) {
    e.preventDefault()
    if (!planModal) return
    const res = await fetch(planModal.mode === 'add' ? '/api/superadmin/plans' : `/api/superadmin/plans/${planModal.id}`, {
      method: planModal.mode === 'add' ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(planForm),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? 'Failed to save plan'); return }
    toast.success(planModal.mode === 'add' ? 'Plan created' : 'Plan updated')
    setPlanModal(null)
    load()
  }
  async function togglePlanActive(p: Plan) {
    const res = await fetch(`/api/superadmin/plans/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !p.isActive }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? 'Failed to update plan'); return }
    toast.success(p.isActive ? `${p.name} archived` : `${p.name} reactivated`)
    load()
  }

  if (loading) return <div className="text-gray-400 text-sm py-12 text-center">Loading…</div>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Platform Overview</h1>
        <p className="text-gray-500 text-sm mt-0.5">{companies.length} companies · {plans.length} plans</p>
      </div>

      <div className="flex items-center gap-1 p-1 bg-gray-900 border border-gray-800 rounded-xl mb-6 w-fit">
        <button onClick={() => setTab('companies')} className={cn('px-4 py-2 rounded-lg text-sm font-semibold', tab === 'companies' ? 'bg-gray-800 text-amber-400' : 'text-gray-500')}>
          <Building2 className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" /> Companies
        </button>
        <button onClick={() => setTab('plans')} className={cn('px-4 py-2 rounded-lg text-sm font-semibold', tab === 'plans' ? 'bg-gray-800 text-amber-400' : 'text-gray-500')}>
          <CreditCard className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" /> Plans
        </button>
      </div>

      {tab === 'companies' && (
        <div className={cn(cardCls, 'overflow-hidden')}>
          <table className="w-full text-sm">
            <thead className="bg-gray-950 text-left text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="p-4">Company</th><th className="p-4">Plan</th><th className="p-4">Billing</th>
                <th className="p-4">Usage</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {companies.map(c => (
                <tr key={c.id}>
                  <td className="p-4">
                    <p className="font-semibold text-white">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.slug}</p>
                  </td>
                  <td className="p-4">
                    <select
                      className="bg-gray-950 border border-gray-800 rounded-lg text-xs text-white px-2 py-1"
                      value={c.subscription?.plan.id ?? ''}
                      onChange={e => changePlan(c, e.target.value)}
                    >
                      {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td className="p-4 text-gray-400 text-xs">
                    {c.subscription?.billingCycle ?? '—'}
                    <br />
                    <span className="text-gray-600">renews {c.subscription ? new Date(c.subscription.currentPeriodEnd).toLocaleDateString() : '—'}</span>
                  </td>
                  <td className="p-4 text-gray-400 text-xs">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {c._count.users}/{c.subscription?.plan.maxUsers ?? '—'}</span>
                    <span className="flex items-center gap-1 mt-0.5"><FolderOpen className="w-3 h-3" /> {c._count.projects}/{c.subscription?.plan.maxProjects ?? '—'}</span>
                  </td>
                  <td className="p-4">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', c.isActive ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400')}>
                      {c.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => toggleCompanyActive(c)} title={c.isActive ? 'Suspend company' : 'Reactivate company'} className="p-1.5 rounded-lg hover:bg-gray-800">
                      {c.isActive ? <Ban className="w-3.5 h-3.5 text-red-400" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  </td>
                </tr>
              ))}
              {!companies.length && <tr><td colSpan={6} className="p-6 text-center text-gray-500">No companies yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'plans' && (
        <>
          <div className="flex justify-end mb-3">
            <button onClick={openAddPlan} className="flex items-center gap-1.5 text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-black px-3 py-2 rounded-lg">
              <Plus className="w-4 h-4" /> New Plan
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map(p => (
              <div key={p.id} className={cn(cardCls, 'p-5', !p.isActive && 'opacity-50')}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-white">{p.name}</h3>
                  <div className="flex gap-1">
                    <button onClick={() => openEditPlan(p)} className="p-1 rounded hover:bg-gray-800"><Pencil className="w-3.5 h-3.5 text-gray-400" /></button>
                    <button onClick={() => togglePlanActive(p)} className="p-1 rounded hover:bg-gray-800">
                      {p.isActive ? <Ban className="w-3.5 h-3.5 text-red-400" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  </div>
                </div>
                <p className="text-2xl font-bold text-amber-400">{p.monthlyPrice === 0 ? 'Free' : `$${p.monthlyPrice}`}<span className="text-xs text-gray-500 font-normal">/mo</span></p>
                <p className="text-xs text-gray-500 mb-3">or ${p.annualPrice}/year</p>
                <p className="text-sm text-gray-400">Up to {p.maxProjects} projects, {p.maxUsers} users</p>
                <p className="text-xs text-gray-600 mt-2">{p._count.subscriptions} companies subscribed</p>
                {!p.isActive && <p className="text-xs text-red-400 mt-1">Archived — hidden from sign-up</p>}
              </div>
            ))}
          </div>
        </>
      )}

      {planModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setPlanModal(null)}>
          <div className={cn(cardCls, 'p-6 w-full max-w-sm')} onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-white mb-4">{planModal.mode === 'add' ? 'New Plan' : 'Edit Plan'}</h3>
            <form onSubmit={savePlan} className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Name</label>
                <input className={inputCls} required value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-400 mb-1 block">Max projects</label>
                  <input type="number" min={1} className={inputCls} required value={planForm.maxProjects} onChange={e => setPlanForm({ ...planForm, maxProjects: parseInt(e.target.value) || 0 })} /></div>
                <div><label className="text-xs text-gray-400 mb-1 block">Max users</label>
                  <input type="number" min={1} className={inputCls} required value={planForm.maxUsers} onChange={e => setPlanForm({ ...planForm, maxUsers: parseInt(e.target.value) || 0 })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-400 mb-1 block">Monthly price ($)</label>
                  <input type="number" min={0} step="0.01" className={inputCls} required value={planForm.monthlyPrice} onChange={e => setPlanForm({ ...planForm, monthlyPrice: parseFloat(e.target.value) || 0 })} /></div>
                <div><label className="text-xs text-gray-400 mb-1 block">Annual price ($)</label>
                  <input type="number" min={0} step="0.01" className={inputCls} required value={planForm.annualPrice} onChange={e => setPlanForm({ ...planForm, annualPrice: parseFloat(e.target.value) || 0 })} /></div>
              </div>
              <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg py-2 text-sm mt-2">
                {planModal.mode === 'add' ? 'Create Plan' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
