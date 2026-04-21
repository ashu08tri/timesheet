'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Users, FolderOpen, Pencil, Shield } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Modal } from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { cn, getRoleColor, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

interface User { id: string; name: string; email: string; role: string; department: string | null }
interface Project { id: string; name: string; code: string; color: string; isActive: boolean; description: string | null }

const PROJECT_COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6']

export default function AdminPage() {
  const [users, setUsers]       = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<'users' | 'projects'>('users')

  // User form
  const [userModal, setUserModal] = useState(false)
  const [userForm, setUserForm]   = useState({ name:'', email:'', password:'', role:'EMPLOYEE', department:'' })
  const [saving, setSaving]       = useState(false)

  // Project form
  const [projModal, setProjModal] = useState(false)
  const [projForm, setProjForm]   = useState({ name:'', code:'', description:'', color:'#6366f1' })

  useEffect(() => {
    async function load() {
      const [uRes, pRes] = await Promise.all([fetch('/api/users'), fetch('/api/projects')])
      setUsers(await uRes.json())
      setProjects(await pRes.json())
      setLoading(false)
    }
    load()
  }, [])

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userForm),
    })
    setSaving(false)
    if (res.ok) {
      const u = await res.json()
      setUsers(prev => [...prev, u])
      setUserModal(false)
      setUserForm({ name:'', email:'', password:'', role:'EMPLOYEE', department:'' })
      toast.success('User created!')
    } else {
      const e = await res.json()
      toast.error(e.error ?? 'Failed to create user')
    }
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/projects', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(projForm),
    })
    setSaving(false)
    if (res.ok) {
      const p = await res.json()
      setProjects(prev => [...prev, p])
      setProjModal(false)
      setProjForm({ name:'', code:'', description:'', color:'#6366f1' })
      toast.success('Project created!')
    } else {
      toast.error('Failed to create project')
    }
  }

  if (loading) return <PageLoader />

  return (
    <>
      <Header
        title="Admin"
        subtitle="Manage users and projects"
        actions={
          <button
            onClick={() => tab === 'users' ? setUserModal(true) : setProjModal(true)}
            className="btn-primary text-sm"
          >
            <Plus className="w-4 h-4" />
            {tab === 'users' ? 'Add user' : 'Add project'}
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit mb-6">
        {[
          { key: 'users',    label: 'Users',    icon: Users,      count: users.length },
          { key: 'projects', label: 'Projects', icon: FolderOpen, count: projects.length },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full">
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Users table */}
      {tab === 'users' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="card overflow-hidden">
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {users.map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ opacity:0, x:-8 }}
                animate={{ opacity:1, x:0 }}
                transition={{ delay: i*0.04 }}
                className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-xs font-bold text-brand-700 dark:text-brand-300 shrink-0">
                  {getInitials(user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.name}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
                {user.department && (
                  <span className="text-xs text-gray-400 hidden sm:block">{user.department}</span>
                )}
                <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full', getRoleColor(user.role))}>
                  {user.role}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Projects table */}
      {tab === 'projects' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="card overflow-hidden">
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {projects.map((proj, i) => (
              <motion.div
                key={proj.id}
                initial={{ opacity:0, x:-8 }}
                animate={{ opacity:1, x:0 }}
                transition={{ delay: i*0.04 }}
                className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: proj.color + '22' }}>
                  <div className="w-3.5 h-3.5 rounded-full" style={{ background: proj.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{proj.name}</p>
                  <p className="text-xs text-gray-400">{proj.description ?? 'No description'}</p>
                </div>
                <code className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-lg font-mono">
                  {proj.code}
                </code>
                <span className={cn(
                  'text-[10px] font-bold px-2 py-1 rounded-full',
                  proj.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
                )}>
                  {proj.isActive ? 'Active' : 'Archived'}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Add User Modal */}
      <Modal open={userModal} onClose={() => setUserModal(false)} title="Add user" size="md">
        <form onSubmit={createUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Full name</label>
              <input required className="input" value={userForm.name} onChange={e => setUserForm(p => ({...p, name: e.target.value}))} />
            </div>
            <div>
              <label className="label">Department</label>
              <input className="input" value={userForm.department} onChange={e => setUserForm(p => ({...p, department: e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input required type="email" className="input" value={userForm.email} onChange={e => setUserForm(p => ({...p, email: e.target.value}))} />
          </div>
          <div>
            <label className="label">Password</label>
            <input required type="password" className="input" value={userForm.password} onChange={e => setUserForm(p => ({...p, password: e.target.value}))} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={userForm.role} onChange={e => setUserForm(p => ({...p, role: e.target.value}))}>
              <option value="EMPLOYEE">Employee</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setUserModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mx-auto" /> : <><Plus className="w-3.5 h-3.5"/>Create user</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Project Modal */}
      <Modal open={projModal} onClose={() => setProjModal(false)} title="Add project" size="md">
        <form onSubmit={createProject} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Project name</label>
              <input required className="input" value={projForm.name} onChange={e => setProjForm(p => ({...p, name: e.target.value}))} />
            </div>
            <div>
              <label className="label">Code</label>
              <input required className="input font-mono" placeholder="PROJ" value={projForm.code} onChange={e => setProjForm(p => ({...p, code: e.target.value.toUpperCase()}))} />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" value={projForm.description} onChange={e => setProjForm(p => ({...p, description: e.target.value}))} />
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PROJECT_COLORS.map(color => (
                <button
                  key={color} type="button"
                  onClick={() => setProjForm(p => ({...p, color}))}
                  className={cn('w-8 h-8 rounded-xl transition-transform', projForm.color === color && 'ring-2 ring-offset-2 ring-gray-400 scale-110')}
                  style={{ background: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setProjModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mx-auto" /> : <><Plus className="w-3.5 h-3.5"/>Create project</>}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
