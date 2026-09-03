'use client'
import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Modal } from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { cn, getInitials } from '@/lib/utils'
import { ArrowLeft, Plus, Lock, Trash2, Clock, CalendarDays, Tags, GitBranch, Save, Users2, Pencil, X } from 'lucide-react'
import toast from 'react-hot-toast'

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const
const WORKFLOW_TYPES = [
  { key: 'DEFAULT', label: 'Default (day-to-day)' },
  { key: 'OVERTIME', label: 'Overtime Hours' },
  { key: 'WEEKEND', label: 'Weekend Hours' },
  { key: 'LEAVE', label: 'Leave Events' },
  { key: 'ESCALATION', label: 'Escalation on no entries' },
  { key: 'HOLIDAY', label: 'Holiday Hours' },
] as const

interface EntryType { id: string; name: string; shortCode: string; isSystem: boolean }
interface Holiday { id: string; date: string; details: string; isRecurring: boolean }
interface RoleRow { id: string; name: string; isSystem: boolean }
interface WorkflowStage { order: number; roleId: string | null; isTerminal: boolean; role: { id: string; name: string } | null }
interface Workflow { type: string; stages: WorkflowStage[] }
interface ProjectConfig {
  id: string; name: string
  standardDayHours: number; minWeekHoursEnabled: boolean; minWeekHours: number | null
  weekends: { day: string }[]
  entryTypes: EntryType[]
  holidays: Holiday[]
  workflows: Workflow[]
}
interface CompanyUser { id: string; name: string; username: string }
interface Member {
  id: string; startDate: string
  user: { id: string; name: string; username: string; email: string | null; avatarUrl: string | null }
  roles: { role: { id: string; name: string } }[]
}

export default function ProjectConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [config, setConfig] = useState<ProjectConfig | null>(null)
  const [roles, setRoles] = useState<RoleRow[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'hours' | 'types' | 'holidays' | 'workflow' | 'members'>('hours')

  async function load() {
    setLoading(true)
    try {
      const [cRes, rRes, mRes, uRes] = await Promise.all([
        fetch(`/api/projects/${id}/config`),
        fetch('/api/roles'),
        fetch(`/api/projects/${id}/members`),
        fetch('/api/users'),
      ])
      if (cRes.ok) setConfig(await cRes.json())
      if (rRes.ok) setRoles(await rRes.json())
      if (mRes.ok) setMembers(await mRes.json())
      if (uRes.ok) setCompanyUsers(await uRes.json())
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [id])

  // --- Hour config + weekends ---
  const [savingHours, setSavingHours] = useState(false)
  async function saveHourConfig(e: React.FormEvent) {
    e.preventDefault()
    if (!config) return
    setSavingHours(true)
    try {
      const res = await fetch(`/api/projects/${id}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          standardDayHours: config.standardDayHours,
          minWeekHoursEnabled: config.minWeekHoursEnabled,
          minWeekHours: config.minWeekHoursEnabled ? config.minWeekHours : null,
          weekendDays: config.weekends.map(w => w.day),
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed to save'); return }
      toast.success('Hour config saved')
      load()
    } finally {
      setSavingHours(false)
    }
  }
  function toggleWeekend(day: string) {
    if (!config) return
    const has = config.weekends.some(w => w.day === day)
    setConfig({
      ...config,
      weekends: has ? config.weekends.filter(w => w.day !== day) : [...config.weekends, { day }],
    })
  }

  // --- Entry types ---
  const [typeModal, setTypeModal] = useState(false)
  const [typeForm, setTypeForm] = useState({ name: '', shortCode: '' })
  async function addEntryType(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch(`/api/projects/${id}/entry-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(typeForm),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? 'Failed to add entry type'); return }
    toast.success('Entry type added')
    setTypeModal(false)
    setTypeForm({ name: '', shortCode: '' })
    load()
  }
  async function deleteEntryType(entryTypeId: string) {
    if (!confirm('Delete this entry type?')) return
    const res = await fetch(`/api/projects/${id}/entry-types/${entryTypeId}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? 'Failed to delete'); return }
    toast.success('Entry type deleted')
    load()
  }

  // --- Holidays ---
  const [holidayModal, setHolidayModal] = useState(false)
  const [holidayForm, setHolidayForm] = useState({ date: '', details: '', isRecurring: false })
  async function addHoliday(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch(`/api/projects/${id}/holidays`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(holidayForm),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? 'Failed to add holiday'); return }
    toast.success('Holiday added')
    setHolidayModal(false)
    setHolidayForm({ date: '', details: '', isRecurring: false })
    load()
  }
  async function deleteHoliday(holidayId: string) {
    if (!confirm('Remove this holiday?')) return
    const res = await fetch(`/api/projects/${id}/holidays/${holidayId}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? 'Failed to delete'); return }
    toast.success('Holiday removed')
    load()
  }

  // --- Approval workflow ---
  const [workflowType, setWorkflowType] = useState<string>('DEFAULT')
  const [stageRoleIds, setStageRoleIds] = useState<string[]>([])
  const [savingWorkflow, setSavingWorkflow] = useState(false)

  useEffect(() => {
    if (!config) return
    const wf = config.workflows.find(w => w.type === workflowType)
    setStageRoleIds(wf ? wf.stages.filter(s => !s.isTerminal).map(s => s.roleId!).filter(Boolean) : [])
  }, [workflowType, config])

  function addStage(roleId: string) {
    if (!roleId) return
    setStageRoleIds([...stageRoleIds, roleId])
  }
  function removeStage(index: number) {
    setStageRoleIds(stageRoleIds.filter((_, i) => i !== index))
  }
  async function saveWorkflow() {
    setSavingWorkflow(true)
    try {
      const res = await fetch(`/api/projects/${id}/workflows/${workflowType}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleIds: stageRoleIds }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed to save workflow'); return }
      toast.success('Workflow saved')
      load()
    } finally {
      setSavingWorkflow(false)
    }
  }

  // --- Members ---
  const [addMemberModal, setAddMemberModal] = useState(false)
  const [memberForm, setMemberForm] = useState<{ userId: string; roleIds: string[]; startDate: string }>({ userId: '', roleIds: [], startDate: '' })
  const [savingMember, setSavingMember] = useState(false)
  const [editMember, setEditMember] = useState<Member | null>(null)
  const [editRoleIds, setEditRoleIds] = useState<string[]>([])

  useEffect(() => {
    setEditRoleIds(editMember ? editMember.roles.map(r => r.role.id) : [])
  }, [editMember])

  if (loading || !config) return <PageLoader />

  const availableUsers = companyUsers.filter(u => !members.some(m => m.user.id === u.id))

  async function addMember(e: React.FormEvent) {
    e.preventDefault()
    if (!memberForm.userId || !memberForm.roleIds.length) {
      toast.error('Select a team member and at least one role')
      return
    }
    setSavingMember(true)
    try {
      const res = await fetch(`/api/projects/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: memberForm.userId, roleIds: memberForm.roleIds, startDate: memberForm.startDate || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed to add member'); return }
      toast.success('Member added to project')
      setAddMemberModal(false)
      setMemberForm({ userId: '', roleIds: [], startDate: '' })
      load()
    } finally {
      setSavingMember(false)
    }
  }

  async function saveEditRoles(e: React.FormEvent) {
    e.preventDefault()
    if (!editMember || !editRoleIds.length) { toast.error('Select at least one role'); return }
    const res = await fetch(`/api/projects/${id}/members/${editMember.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleIds: editRoleIds }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? 'Failed to update roles'); return }
    toast.success('Roles updated')
    setEditMember(null)
    load()
  }

  async function removeMember(member: Member) {
    if (!confirm(`Remove ${member.user.name} from this project?`)) return
    const res = await fetch(`/api/projects/${id}/members/${member.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? 'Failed to remove member'); return }
    toast.success('Member removed')
    load()
  }

  function toggleMemberFormRole(roleId: string) {
    setMemberForm(f => ({
      ...f,
      roleIds: f.roleIds.includes(roleId) ? f.roleIds.filter(r => r !== roleId) : [...f.roleIds, roleId],
    }))
  }
  function toggleEditRole(roleId: string) {
    setEditRoleIds(r => (r.includes(roleId) ? r.filter(x => x !== roleId) : [...r, roleId]))
  }

  return (
    <>
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin
      </Link>
      <Header title={`Project Config — ${config.name}`} subtitle="Members, weekends, hour config, entry types, holidays, and approval workflow" />

      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6 w-fit overflow-x-auto">
        {[
          { key: 'members', label: 'Members', icon: Users2 },
          { key: 'hours', label: 'Hour Config', icon: Clock },
          { key: 'types', label: 'Entry Types', icon: Tags },
          { key: 'holidays', label: 'Holidays', icon: CalendarDays },
          { key: 'workflow', label: 'Approval Workflow', icon: GitBranch },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={cn('px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors', tab === t.key ? 'bg-white dark:bg-gray-900 shadow-sm text-brand-600' : 'text-gray-500 hover:text-gray-700')}
          >
            <t.icon className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'members' && (
        <div className="card p-0 overflow-hidden max-w-3xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500">Team members on this project, with start date and role(s).</p>
            <button onClick={() => setAddMemberModal(true)} className="btn-primary text-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add Members
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-left text-xs text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="p-4">Name</th><th className="p-4">Employee Code</th><th className="p-4">Start Date</th>
                <th className="p-4">Roles</th><th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {members.map(m => (
                <tr key={m.id}>
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300 shrink-0">
                        {getInitials(m.user.name)}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{m.user.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-500">{m.user.username}</td>
                  <td className="p-4 text-gray-500">{new Date(m.startDate).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {m.roles.map(r => (
                        <span key={r.role.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                          {r.role.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-right space-x-1">
                    <button onClick={() => setEditMember(m)} title="Edit roles" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeMember(m)} title="Remove from project" className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {!members.length && (
                <tr><td colSpan={5} className="p-6 text-center text-gray-400">No members added yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'hours' && (
        <form onSubmit={saveHourConfig} className="card p-6 space-y-6 max-w-xl">
          <div>
            <label className="label">Standard day hours</label>
            <input type="number" step="0.5" min="1" max="24" className="input" value={config.standardDayHours}
              onChange={e => setConfig({ ...config, standardDayHours: parseFloat(e.target.value) })} />
          </div>
          <div>
            <label className="flex items-center gap-2 mb-2">
              <input type="checkbox" checked={config.minWeekHoursEnabled}
                onChange={e => setConfig({ ...config, minWeekHoursEnabled: e.target.checked })} />
              <span className="label !mb-0">Enforce minimum week hours</span>
            </label>
            {config.minWeekHoursEnabled && (
              <input type="number" step="0.5" min="1" className="input" placeholder="e.g. 40" value={config.minWeekHours ?? ''}
                onChange={e => setConfig({ ...config, minWeekHours: parseFloat(e.target.value) })} />
            )}
          </div>
          <div>
            <label className="label">Weekend days</label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map(day => {
                const active = config.weekends.some(w => w.day === day)
                return (
                  <button type="button" key={day} onClick={() => toggleWeekend(day)}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                      active ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300')}>
                    {day}
                  </button>
                )
              })}
            </div>
          </div>
          <button type="submit" disabled={savingHours} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" /> {savingHours ? 'Saving…' : 'Save Hour Config'}
          </button>
        </form>
      )}

      {tab === 'types' && (
        <div className="card p-0 overflow-hidden max-w-2xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500">Standard, Overtime, Weekend, and Holiday can&apos;t be edited or removed.</p>
            <button onClick={() => setTypeModal(true)} className="btn-primary text-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add Type
            </button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {config.entryTypes.map(t => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white text-sm">{t.name}</span>
                  <code className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded font-mono">{t.shortCode}</code>
                  {t.isSystem && <span className="inline-flex items-center gap-1 text-xs text-gray-400"><Lock className="w-3 h-3" /> Locked</span>}
                </div>
                {!t.isSystem && (
                  <button onClick={() => deleteEntryType(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'holidays' && (
        <div className="card p-0 overflow-hidden max-w-2xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500">Project holidays. Recurring ones apply every year.</p>
            <button onClick={() => setHolidayModal(true)} className="btn-primary text-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add Holiday
            </button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {config.holidays.map(h => (
              <div key={h.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{h.details}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(h.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: h.isRecurring ? undefined : 'numeric' })}
                    {h.isRecurring && ' · Recurring every year'}
                  </p>
                </div>
                <button onClick={() => deleteHoliday(h.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {!config.holidays.length && <p className="p-4 text-sm text-gray-400">No holidays added yet.</p>}
          </div>
        </div>
      )}

      {tab === 'workflow' && (
        <div className="card p-6 max-w-2xl space-y-5">
          <div>
            <label className="label">Workflow type</label>
            <select className="input" value={workflowType} onChange={e => setWorkflowType(e.target.value)}>
              {WORKFLOW_TYPES.map(w => <option key={w.key} value={w.key}>{w.label}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Stages</label>
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300">Employee</span>
              {stageRoleIds.map((roleId, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="text-gray-300">→</span>
                  <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 flex items-center gap-1.5">
                    {roles.find(r => r.id === roleId)?.name ?? 'Unknown role'}
                    <button onClick={() => removeStage(i)} className="hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                  </span>
                </div>
              ))}
              <span className="text-gray-300">→</span>
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Closed</span>
            </div>
          </div>

          <div>
            <label className="label">Add a stage</label>
            <select className="input" value="" onChange={e => addStage(e.target.value)}>
              <option value="">— Select a role to add before Closed —</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">First stage is always Employee, last stage is always Closed.</p>
          </div>

          <button onClick={saveWorkflow} disabled={savingWorkflow} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" /> {savingWorkflow ? 'Saving…' : 'Save Workflow'}
          </button>
        </div>
      )}

      {/* Add entry type modal */}
      <Modal open={typeModal} onClose={() => setTypeModal(false)} title="Add Entry Type">
        <form onSubmit={addEntryType} className="space-y-4">
          <div><label className="label">Name</label><input className="input" required value={typeForm.name} onChange={e => setTypeForm({ ...typeForm, name: e.target.value })} placeholder="e.g. Sick Leave" /></div>
          <div><label className="label">Short code</label><input className="input" required value={typeForm.shortCode} onChange={e => setTypeForm({ ...typeForm, shortCode: e.target.value.toUpperCase() })} placeholder="e.g. SICK" /></div>
          <button type="submit" className="btn-primary w-full">Add</button>
        </form>
      </Modal>

      {/* Add holiday modal */}
      <Modal open={holidayModal} onClose={() => setHolidayModal(false)} title="Add Holiday">
        <form onSubmit={addHoliday} className="space-y-4">
          <div><label className="label">Date</label><input type="date" className="input" required value={holidayForm.date} onChange={e => setHolidayForm({ ...holidayForm, date: e.target.value })} /></div>
          <div><label className="label">Details</label><input className="input" required value={holidayForm.details} onChange={e => setHolidayForm({ ...holidayForm, details: e.target.value })} placeholder="e.g. Republic Day" /></div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={holidayForm.isRecurring} onChange={e => setHolidayForm({ ...holidayForm, isRecurring: e.target.checked })} />
            <span className="label !mb-0">Recurring every year</span>
          </label>
          <button type="submit" className="btn-primary w-full">Add Holiday</button>
        </form>
      </Modal>
      {/* Add member modal */}
      <Modal open={addMemberModal} onClose={() => setAddMemberModal(false)} title="Add Members">
        <form onSubmit={addMember} className="space-y-4">
          <div>
            <label className="label">Team member</label>
            <select className="input" required value={memberForm.userId} onChange={e => setMemberForm({ ...memberForm, userId: e.target.value })}>
              <option value="">— Select a team member —</option>
              {availableUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.username})</option>)}
            </select>
            {!availableUsers.length && <p className="text-xs text-gray-400 mt-1">Everyone in your company is already a member of this project.</p>}
          </div>
          <div>
            <label className="label">Role(s)</label>
            <div className="flex flex-wrap gap-2">
              {roles.map(r => (
                <button type="button" key={r.id} onClick={() => toggleMemberFormRole(r.id)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                    memberForm.roleIds.includes(r.id) ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300')}>
                  {r.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Start date</label>
            <input type="date" className="input" value={memberForm.startDate} onChange={e => setMemberForm({ ...memberForm, startDate: e.target.value })} />
          </div>
          <button type="submit" disabled={savingMember} className="btn-primary w-full">{savingMember ? 'Adding…' : 'Add to Project'}</button>
        </form>
      </Modal>

      {/* Edit member roles modal */}
      <Modal open={!!editMember} onClose={() => setEditMember(null)} title="Edit Roles" description={editMember ? editMember.user.name : ''}>
        {editMember && (
          <form onSubmit={saveEditRoles} className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {roles.map(r => (
                <button type="button" key={r.id} onClick={() => toggleEditRole(r.id)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                    editRoleIds.includes(r.id) ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300')}>
                  {r.name}
                </button>
              ))}
            </div>
            <button type="submit" className="btn-primary w-full">Save</button>
          </form>
        )}
      </Modal>
    </>
  )
}
