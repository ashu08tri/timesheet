'use client'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Modal } from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { cn, getInitials, getRoleColor } from '@/lib/utils'
import { Plus, Shield, Lock, Pencil, Trash2, UserCog, KeyRound, Ban, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface RoleRow { id: string; name: string; isSystem: boolean }
interface UserRow {
  id: string; name: string; username: string; email: string | null; role: string
  department: string | null; contactNumber: string | null; contactAddress: string | null
  engagementType: string | null; engagementStart: string | null
  accessStatus: 'ACTIVE' | 'BLOCKED'; lastLoginAt: string | null
  projectMemberships: { project: { id: string; name: string; code: string }; roles: { role: { id: string; name: string } }[] }[]
}

export default function MastersPage() {
  const [tab, setTab] = useState<'roles' | 'users'>('roles')
  const [roles, setRoles] = useState<RoleRow[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)

  async function loadAll() {
    setLoading(true)
    try {
      const [rRes, uRes] = await Promise.all([fetch('/api/roles'), fetch('/api/users')])
      if (rRes.ok) setRoles(await rRes.json())
      if (uRes.ok) setUsers(await uRes.json())
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { loadAll() }, [])

  // --- Role Master ---
  const [roleModal, setRoleModal] = useState<{ mode: 'add' | 'edit'; id?: string; name: string } | null>(null)
  const [savingRole, setSavingRole] = useState(false)

  async function saveRole(e: React.FormEvent) {
    e.preventDefault()
    if (!roleModal) return
    setSavingRole(true)
    try {
      const res = await fetch(roleModal.mode === 'add' ? '/api/roles' : `/api/roles/${roleModal.id}`, {
        method: roleModal.mode === 'add' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roleModal.name }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed to save role'); return }
      toast.success(roleModal.mode === 'add' ? 'Role added' : 'Role updated')
      setRoleModal(null)
      loadAll()
    } finally {
      setSavingRole(false)
    }
  }

  async function deleteRole(role: RoleRow) {
    if (role.isSystem) return
    if (!confirm(`Delete role "${role.name}"?`)) return
    const res = await fetch(`/api/roles/${role.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? 'Failed to delete role'); return }
    toast.success('Role deleted')
    loadAll()
  }

  // --- User Master ---
  const [userModal, setUserModal] = useState(false)
  const [userForm, setUserForm] = useState({
    name: '', username: '', email: '', password: '', role: 'EMPLOYEE', department: '',
    contactNumber: '', contactAddress: '', engagementType: '', engagementStart: '',
  })
  const [savingUser, setSavingUser] = useState(false)
  const [overviewUser, setOverviewUser] = useState<UserRow | null>(null)
  const [pwModal, setPwModal] = useState<{ id: string; name: string } | null>(null)
  const [newPassword, setNewPassword] = useState('')

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    setSavingUser(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userForm,
          email: userForm.email || undefined,
          engagementType: userForm.engagementType || undefined,
          engagementStart: userForm.engagementStart || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed to add user'); return }
      toast.success('User added')
      setUserModal(false)
      setUserForm({ name:'', username:'', email:'', password:'', role:'EMPLOYEE', department:'', contactNumber:'', contactAddress:'', engagementType:'', engagementStart:'' })
      loadAll()
    } finally {
      setSavingUser(false)
    }
  }

  async function toggleAccess(user: UserRow) {
    const next = user.accessStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE'
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessStatus: next }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? 'Failed to update access'); return }
    toast.success(next === 'BLOCKED' ? `${user.name} blocked` : `${user.name} unblocked`)
    loadAll()
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!pwModal) return
    const res = await fetch(`/api/users/${pwModal.id}/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? 'Failed to change password'); return }
    toast.success('Password changed')
    setPwModal(null)
    setNewPassword('')
  }

  if (loading) return <PageLoader />

  return (
    <>
      <Header title="Masters" subtitle="Role Master and User Master for your company" />

      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6 w-fit">
        <button onClick={() => setTab('roles')} className={cn('px-4 py-2 rounded-lg text-sm font-semibold transition-colors', tab === 'roles' ? 'bg-white dark:bg-gray-900 shadow-sm text-brand-600' : 'text-gray-500 hover:text-gray-700')}>
          <Shield className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" /> Role Master
        </button>
        <button onClick={() => setTab('users')} className={cn('px-4 py-2 rounded-lg text-sm font-semibold transition-colors', tab === 'users' ? 'bg-white dark:bg-gray-900 shadow-sm text-brand-600' : 'text-gray-500 hover:text-gray-700')}>
          <UserCog className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" /> User Master
        </button>
      </div>

      {tab === 'roles' && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500">Roles assignable to project members. Employee &amp; Project Manager are system roles.</p>
            <button onClick={() => setRoleModal({ mode: 'add', name: '' })} className="btn-primary text-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add Role
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-left text-xs text-gray-400 uppercase tracking-wider">
              <tr><th className="p-4">Role name</th><th className="p-4">Type</th><th className="p-4 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {roles.map(role => (
                <tr key={role.id}>
                  <td className="p-4 font-medium text-gray-900 dark:text-white">{role.name}</td>
                  <td className="p-4">
                    {role.isSystem
                      ? <span className="inline-flex items-center gap-1 text-xs text-gray-500"><Lock className="w-3 h-3" /> System</span>
                      : <span className="text-xs text-gray-500">Custom</span>}
                  </td>
                  <td className="p-4 text-right space-x-1">
                    <button
                      disabled={role.name === 'Employee'}
                      onClick={() => setRoleModal({ mode: 'edit', id: role.id, name: role.name })}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
                    ><Pencil className="w-3.5 h-3.5" /></button>
                    <button
                      disabled={role.isSystem}
                      onClick={() => deleteRole(role)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                    ><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'users' && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500">All users in your company, with engagement &amp; access status.</p>
            <button onClick={() => setUserModal(true)} className="btn-primary text-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add User
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-left text-xs text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="p-4">Name</th><th className="p-4">Username</th><th className="p-4">Engagement</th>
                <th className="p-4">Projects</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="p-4">
                    <button onClick={() => setOverviewUser(u)} className="flex items-center gap-2.5 text-left hover:underline">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300 shrink-0">
                        {getInitials(u.name)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{u.name}</div>
                        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', getRoleColor(u.role))}>{u.role}</span>
                      </div>
                    </button>
                  </td>
                  <td className="p-4 text-gray-500">{u.username}</td>
                  <td className="p-4 text-gray-500">{u.engagementType ?? '—'}</td>
                  <td className="p-4 text-gray-500 text-xs">
                    {u.projectMemberships.length
                      ? u.projectMemberships.map(m => `${m.project.code} (${m.roles.map(r => r.role.name).join(', ')})`).join(', ')
                      : '—'}
                  </td>
                  <td className="p-4">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', u.accessStatus === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300')}>
                      {u.accessStatus === 'ACTIVE' ? 'Active' : 'Blocked'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-1">
                    <button onClick={() => { setPwModal({ id: u.id, name: u.name }); setNewPassword('') }} title="Change password" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => toggleAccess(u)} title={u.accessStatus === 'ACTIVE' ? 'Block access' : 'Unblock access'} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                      {u.accessStatus === 'ACTIVE' ? <Ban className="w-3.5 h-3.5 text-red-500" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Role modal */}
      <Modal open={!!roleModal} onClose={() => setRoleModal(null)} title={roleModal?.mode === 'add' ? 'Add Role' : 'Rename Role'}>
        {roleModal && (
          <form onSubmit={saveRole} className="space-y-4">
            <div>
              <label className="label">Role name</label>
              <input className="input" required value={roleModal.name} onChange={e => setRoleModal({ ...roleModal, name: e.target.value })} placeholder="e.g. Verifier" />
            </div>
            <button type="submit" disabled={savingRole} className="btn-primary w-full">{savingRole ? 'Saving…' : 'Save'}</button>
          </form>
        )}
      </Modal>

      {/* Add user modal */}
      <Modal open={userModal} onClose={() => setUserModal(false)} title="Add User" size="lg">
        <form onSubmit={createUser} className="grid sm:grid-cols-2 gap-4">
          <div><label className="label">Name *</label><input className="input" required value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} /></div>
          <div><label className="label">Username *</label><input className="input" required value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} /></div>
          <div><label className="label">Password *</label><input type="password" className="input" required minLength={8} value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} /></div>
          <div><label className="label">Role</label>
            <select className="input" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
              <option value="EMPLOYEE">Employee</option><option value="MANAGER">Manager</option><option value="ADMIN">Admin</option>
            </select>
          </div>
          <div><label className="label">Email <span className="text-gray-400 font-normal">(optional)</span></label><input type="email" className="input" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} /></div>
          <div><label className="label">Department <span className="text-gray-400 font-normal">(optional)</span></label><input className="input" value={userForm.department} onChange={e => setUserForm({ ...userForm, department: e.target.value })} /></div>
          <div><label className="label">Contact number <span className="text-gray-400 font-normal">(optional)</span></label><input className="input" value={userForm.contactNumber} onChange={e => setUserForm({ ...userForm, contactNumber: e.target.value })} /></div>
          <div><label className="label">Type of engagement <span className="text-gray-400 font-normal">(optional)</span></label>
            <select className="input" value={userForm.engagementType} onChange={e => setUserForm({ ...userForm, engagementType: e.target.value })}>
              <option value="">— Not set —</option>
              <option value="PERMANENT">Permanent</option><option value="TEMPORARY">Temporary</option><option value="CONTRACT">Contract</option>
            </select>
          </div>
          <div><label className="label">Start date of engagement <span className="text-gray-400 font-normal">(optional)</span></label><input type="date" className="input" value={userForm.engagementStart} onChange={e => setUserForm({ ...userForm, engagementStart: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label">Contact address <span className="text-gray-400 font-normal">(optional)</span></label><input className="input" value={userForm.contactAddress} onChange={e => setUserForm({ ...userForm, contactAddress: e.target.value })} /></div>
          <button type="submit" disabled={savingUser} className="btn-primary sm:col-span-2">{savingUser ? 'Saving…' : 'Add User'}</button>
        </form>
      </Modal>

      {/* Change password modal */}
      <Modal open={!!pwModal} onClose={() => setPwModal(null)} title="Change Password" description={pwModal ? `For ${pwModal.name}` : ''}>
        {pwModal && (
          <form onSubmit={changePassword} className="space-y-4">
            <div><label className="label">New password</label><input type="password" className="input" required minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
            <button type="submit" className="btn-primary w-full">Change Password</button>
          </form>
        )}
      </Modal>

      {/* Overview modal */}
      <Modal open={!!overviewUser} onClose={() => setOverviewUser(null)} title={overviewUser?.name ?? ''} description="User overview" size="lg">
        {overviewUser && (
          <div className="space-y-4 text-sm">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><span className="text-gray-400 text-xs uppercase tracking-wide">Username</span><p className="text-gray-900 dark:text-white">{overviewUser.username}</p></div>
              <div><span className="text-gray-400 text-xs uppercase tracking-wide">Email</span><p className="text-gray-900 dark:text-white">{overviewUser.email ?? '—'}</p></div>
              <div><span className="text-gray-400 text-xs uppercase tracking-wide">Contact number</span><p className="text-gray-900 dark:text-white">{overviewUser.contactNumber ?? '—'}</p></div>
              <div><span className="text-gray-400 text-xs uppercase tracking-wide">Engagement</span><p className="text-gray-900 dark:text-white">{overviewUser.engagementType ?? '—'}</p></div>
              <div className="sm:col-span-2"><span className="text-gray-400 text-xs uppercase tracking-wide">Address</span><p className="text-gray-900 dark:text-white">{overviewUser.contactAddress ?? '—'}</p></div>
            </div>
            <div>
              <span className="text-gray-400 text-xs uppercase tracking-wide">Projects &amp; roles</span>
              <ul className="mt-1 space-y-1">
                {overviewUser.projectMemberships.map((m, i) => (
                  <li key={i} className="text-gray-900 dark:text-white">{m.project.name} — {m.roles.map(r => r.role.name).join(', ')}</li>
                ))}
                {!overviewUser.projectMemberships.length && <li className="text-gray-400">No project memberships</li>}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
