'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import { Header } from '@/components/layout/Header'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatHours, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Entry {
  id: string
  projectId: string
  date: string
  hours: number
  description: string | null
  isBillable: boolean
  project: { id: string; name: string; code: string; color: string }
}

interface Timesheet {
  id: string
  status: string
  weekStart: string
  weekEnd: string
  totalHours: number
  submittedAt: string | null
  notes: string | null
  user: { id: string; name: string; email: string; department: string | null }
  entries: Entry[]
}

type FilterStatus = 'all' | 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED'

async function safeFetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const text = await res.text()
    if (!text) return null
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export default function ApprovalsPage() {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState<FilterStatus>('SUBMITTED')
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')
  const [acting, setActing]           = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const data = await safeFetchJson<Timesheet[]>('/api/timesheets?team=true')
    setTimesheets(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function approve(id: string) {
    setActing(id)
    try {
      const res = await fetch(`/api/timesheets/${id}/approve`, { method: 'POST' })
      if (!res.ok) throw new Error()
      toast.success('Timesheet approved!')
      await load()
    } catch {
      toast.error('Failed to approve')
    } finally {
      setActing(null)
    }
  }

  async function reject() {
    if (!rejectModal || !rejectNotes.trim()) return
    setActing(rejectModal.id)
    try {
      const res = await fetch(`/api/timesheets/${rejectModal.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: rejectNotes }),
      })
      if (!res.ok) throw new Error()
      toast.success('Timesheet rejected with feedback')
      setRejectModal(null)
      setRejectNotes('')
      await load()
    } catch {
      toast.error('Failed to reject')
    } finally {
      setActing(null)
    }
  }

  const filtered = filter === 'all'
    ? timesheets
    : timesheets.filter(t => t.status === filter)

  const counts = {
    SUBMITTED: timesheets.filter(t => t.status === 'SUBMITTED').length,
    IN_REVIEW: timesheets.filter(t => t.status === 'IN_REVIEW').length,
    APPROVED:  timesheets.filter(t => t.status === 'APPROVED').length,
    REJECTED:  timesheets.filter(t => t.status === 'REJECTED').length,
  }

  if (loading) return <PageLoader />

  return (
    <>
      <Header
        title="Approvals"
        subtitle="Review and approve your team's timesheets"
      />

      {/* Filter tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6 w-fit overflow-x-auto">
        {(
          [
            { key: 'SUBMITTED', label: 'Pending',   count: counts.SUBMITTED },
            { key: 'IN_REVIEW', label: 'In review', count: counts.IN_REVIEW },
            { key: 'APPROVED',  label: 'Approved',  count: counts.APPROVED  },
            { key: 'REJECTED',  label: 'Rejected',  count: counts.REJECTED  },
            { key: 'all',       label: 'All',        count: timesheets.length },
          ] as const
        ).map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
              filter === tab.key
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
            ].join(' ')}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={[
                'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                filter === tab.key
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
              ].join(' ')}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="All clear!"
          description="No timesheets matching this filter."
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map((ts, i) => (
              <motion.div
                key={ts.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ delay: i * 0.04 }}
                className="card overflow-hidden"
              >
                {/* Row header */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  onClick={() => setExpanded(expanded === ts.id ? null : ts.id)}
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-xs font-bold text-brand-700 dark:text-brand-300 shrink-0">
                    {getInitials(ts.user.name)}
                  </div>

                  {/* User & week */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{ts.user.name}</p>
                      {ts.user.department && (
                        <span className="text-xs text-gray-400">{ts.user.department}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Week of {format(new Date(ts.weekStart), 'MMM d, yyyy')}
                      {ts.submittedAt && ` · Submitted ${format(new Date(ts.submittedAt), 'MMM d')}`}
                    </p>
                  </div>

                  {/* Hours */}
                  <div className="text-right hidden sm:block shrink-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                      {formatHours(ts.totalHours)}
                    </p>
                    <p className="text-xs text-gray-400">{ts.entries.length} entries</p>
                  </div>

                  {/* Status badge */}
                  <StatusBadge status={ts.status} size="sm" />

                  {/* Action buttons */}
                  {['SUBMITTED', 'IN_REVIEW'].includes(ts.status) && (
                    <div
                      className="flex items-center gap-1.5 shrink-0"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => approve(ts.id)}
                        disabled={acting === ts.id}
                        className="btn-success text-xs py-1.5"
                      >
                        {acting === ts.id ? (
                          <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setRejectModal({ id: ts.id, name: ts.user.name })}
                        disabled={acting === ts.id}
                        className="btn-danger text-xs py-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  )}

                  {expanded === ts.id
                    ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                  }
                </div>

                {/* Expanded entries */}
                <AnimatePresence>
                  {expanded === ts.id && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden border-t border-gray-100 dark:border-gray-800"
                    >
                      <div className="p-4 space-y-2 bg-gray-50/50 dark:bg-gray-800/30">
                        <div className="grid grid-cols-[1fr_1fr_80px_60px] gap-2 px-2 mb-1">
                          <p className="table-header">Date</p>
                          <p className="table-header">Project</p>
                          <p className="table-header text-right">Hours</p>
                          <p className="table-header text-center">Bill.</p>
                        </div>
                        {ts.entries.map(entry => (
                          <div
                            key={entry.id}
                            className="grid grid-cols-[1fr_1fr_80px_60px] gap-2 items-center bg-white dark:bg-gray-900 rounded-xl px-3 py-2.5"
                          >
                            <span className="text-xs text-gray-500">
                              {format(new Date(entry.date), 'EEE, MMM d')}
                            </span>
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ background: entry.project.color }}
                              />
                              <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
                                {entry.project.name}
                                {entry.description ? ` · ${entry.description}` : ''}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-right tabular-nums text-gray-900 dark:text-white">
                              {entry.hours}h
                            </span>
                            <span className={[
                              'text-center text-xs font-bold',
                              entry.isBillable ? 'text-emerald-600' : 'text-gray-400',
                            ].join(' ')}>
                              {entry.isBillable ? 'Yes' : 'No'}
                            </span>
                          </div>
                        ))}
                        {ts.notes && (
                          <div className="mt-2 p-3 bg-white dark:bg-gray-900 rounded-xl">
                            <p className="text-xs font-semibold text-gray-500 mb-1">Notes</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{ts.notes}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Reject Modal */}
      <Modal
        open={!!rejectModal}
        onClose={() => { setRejectModal(null); setRejectNotes('') }}
        title="Reject timesheet"
        description={rejectModal ? `Provide feedback for ${rejectModal.name}` : ''}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Reason for rejection *</label>
            <textarea
              value={rejectNotes}
              onChange={e => setRejectNotes(e.target.value)}
              placeholder="Explain what needs to be corrected..."
              rows={3}
              className="input resize-none text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setRejectModal(null); setRejectNotes('') }}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={reject}
              disabled={!rejectNotes.trim() || acting === rejectModal?.id}
              className="btn-danger flex-1"
            >
              {acting === rejectModal?.id ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mx-auto" />
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  Reject
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
