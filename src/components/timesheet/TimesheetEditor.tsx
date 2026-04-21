'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Save, Send, RefreshCw, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { EntryRow } from './EntryRow'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Modal } from '@/components/ui/Modal'
import { cn, formatHours, getWeekDays } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Project { id: string; name: string; code: string; color: string }

interface Entry {
  id?: string
  projectId: string
  date: string
  hours: number
  description: string
  isBillable: boolean
}

interface TimesheetEntry extends Entry {
  project: Project
}

interface Timesheet {
  id: string
  status: string
  totalHours: number
  notes: string | null
  weekStart: string
  entries: TimesheetEntry[]
}

interface TimesheetEditorProps {
  weekStart: Date
  projects: Project[]
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export function TimesheetEditor({ weekStart, projects }: TimesheetEditorProps) {
  const [timesheet, setTimesheet]     = useState<Timesheet | null>(null)
  const [entries, setEntries]         = useState<Entry[]>([])
  const [notes, setNotes]             = useState('')
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [submitModal, setSubmitModal] = useState(false)

  const weekDays = getWeekDays(weekStart)
  const readOnly = timesheet ? !['DRAFT', 'REJECTED'].includes(timesheet.status) : false

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const listRes = await fetch('/api/timesheets')
        if (!listRes.ok) throw new Error(`HTTP ${listRes.status}`)
        const listText = await listRes.text()
        const list: Timesheet[] = listText ? JSON.parse(listText) : []

        const existing = Array.isArray(list)
          ? list.find(t => new Date(t.weekStart).toDateString() === weekStart.toDateString())
          : undefined

        if (existing) {
          setTimesheet(existing)
          setEntries(existing.entries.map(e => ({
            id:          e.id,
            projectId:   e.projectId,
            date:        typeof e.date === 'string' ? e.date : new Date(e.date).toISOString(),
            hours:       e.hours,
            description: e.description ?? '',
            isBillable:  e.isBillable,
          })))
          setNotes(existing.notes ?? '')
        } else {
          const createRes = await fetch('/api/timesheets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weekStart: weekStart.toISOString() }),
          })
          if (!createRes.ok) throw new Error(`Create failed: HTTP ${createRes.status}`)
          const createText = await createRes.text()
          const created: Timesheet | null = createText ? JSON.parse(createText) : null
          if (created) setTimesheet(created)
          setEntries([])
          setNotes('')
        }
      } catch (err) {
        console.error('Timesheet load error:', err)
        toast.error('Failed to load timesheet')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [weekStart])

  function addEntry(dayIndex: number) {
    const date = addDays(weekStart, dayIndex)
    setEntries(prev => [...prev, {
      projectId:   projects[0]?.id ?? '',
      date:        date.toISOString(),
      hours:       8,
      description: '',
      isBillable:  true,
    }])
  }

  function updateEntry(index: number, field: string, value: string | number | boolean) {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e))
  }

  function removeEntry(index: number) {
    setEntries(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!timesheet) return
    setSaving(true)
    try {
      const res = await fetch(`/api/timesheets/${timesheet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries, notes }),
      })
      const text = await res.text()
      const updated: Timesheet = text ? JSON.parse(text) : null
      if (updated) setTimesheet(updated)
      toast.success('Timesheet saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit() {
    if (!timesheet) return
    await handleSave()
    setSaving(true)
    try {
      const res = await fetch(`/api/timesheets/${timesheet.id}/submit`, { method: 'POST' })
      const text = await res.text()
      const updated: Timesheet = text ? JSON.parse(text) : null
      if (updated) setTimesheet(updated)
      setSubmitModal(false)
      toast.success('Timesheet submitted for approval!')
    } catch {
      toast.error('Failed to submit')
    } finally {
      setSaving(false)
    }
  }

  const totalHours    = entries.reduce((s, e) => s + (e.hours || 0), 0)
  const billableHours = entries.filter(e => e.isBillable).reduce((s, e) => s + (e.hours || 0), 0)

  if (loading) {
    return (
      <div className="card p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-200 dark:border-gray-700 border-t-brand-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading timesheet…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {format(weekStart, 'MMMM yyyy')} · Week {format(weekStart, 'w')}
              </p>
            </div>
            {timesheet && <StatusBadge status={timesheet.status} />}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-400">Total</p>
              <p className={cn(
                'text-lg font-bold tabular-nums',
                totalHours > 40 ? 'text-amber-600' : 'text-gray-900 dark:text-white'
              )}>
                {formatHours(totalHours)}
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-400">Billable</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatHours(billableHours)}
              </p>
            </div>

            {!readOnly && (
              <div className="flex items-center gap-2">
                <button onClick={handleSave} disabled={saving} className="btn-secondary text-xs">
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </button>
                <button
                  onClick={() => setSubmitModal(true)}
                  disabled={saving || entries.length === 0}
                  className="btn-primary text-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Rejection notice */}
        {timesheet?.status === 'REJECTED' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 border-b border-red-100 dark:border-red-900/30"
          >
            <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">Timesheet rejected</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Please update and resubmit.</p>
            </div>
          </motion.div>
        )}

        {/* Approved notice */}
        {timesheet?.status === 'APPROVED' && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/30">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              This timesheet has been approved.
            </p>
          </div>
        )}

        {/* Column headers */}
        <div className="grid grid-cols-[140px_1fr_100px_36px] gap-2 px-4 py-2
                        bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
          <p className="table-header">Day</p>
          <p className="table-header">Project &amp; Description</p>
          <p className="table-header text-center">Hours</p>
          <div />
        </div>

        {/* Entries grouped by day */}
        <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
          {weekDays.map((day, dayIdx) => {
            const dayEntries = entries.filter(e =>
              new Date(e.date).toDateString() === day.toDateString()
            )
            const dayTotal   = dayEntries.reduce((s, e) => s + (e.hours || 0), 0)
            const isWeekend  = dayIdx >= 5

            return (
              <div key={dayIdx} className="px-4 py-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 w-20">
                      {DAY_NAMES[dayIdx]}
                    </span>
                    <span className="text-xs text-gray-400">{format(day, 'MMM d')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {dayTotal > 0 && (
                      <span className={cn(
                        'text-xs font-bold tabular-nums px-2 py-0.5 rounded-full',
                        dayTotal > 8
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      )}>
                        {formatHours(dayTotal)}
                      </span>
                    )}
                    {!readOnly && (
                      <button
                        onClick={() => addEntry(dayIdx)}
                        className="text-xs flex items-center gap-1 text-brand-600 dark:text-brand-400
                                   hover:text-brand-700 px-2 py-1 rounded-lg hover:bg-brand-50
                                   dark:hover:bg-brand-950/30 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Add
                      </button>
                    )}
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {dayEntries.length === 0 ? (
                    <p className="text-xs text-gray-300 dark:text-gray-700 py-1 pl-2 italic">
                      No entries
                    </p>
                  ) : (
                    dayEntries.map((entry, i) => {
                      const globalIdx = entries.indexOf(entry)
                      return (
                        <motion.div
                          key={`${dayIdx}-${i}`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <EntryRow
                            entry={entry}
                            projects={projects}
                            dayLabel={format(day, 'EEE')}
                            isWeekend={isWeekend}
                            readOnly={readOnly}
                            onUpdate={(field, value) => updateEntry(globalIdx, field, value)}
                            onDelete={() => removeEntry(globalIdx)}
                          />
                        </motion.div>
                      )
                    })
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>

        {/* Notes */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <label className="label">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any notes about this week's work…"
            rows={2}
            disabled={readOnly}
            className="input resize-none text-sm"
          />
        </div>

        {/* Summary bar */}
        <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800/50
                        border-t border-gray-100 dark:border-gray-800 text-xs">
          <span className="text-gray-500">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
          <span className="text-gray-300 dark:text-gray-700">·</span>
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            {formatHours(totalHours)} total
          </span>
          <span className="text-gray-300 dark:text-gray-700">·</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            {formatHours(billableHours)} billable
          </span>
          {totalHours > 40 && (
            <>
              <span className="text-gray-300 dark:text-gray-700">·</span>
              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Overtime: {formatHours(totalHours - 40)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Submit modal */}
      <Modal
        open={submitModal}
        onClose={() => setSubmitModal(false)}
        title="Submit timesheet"
        description="Once submitted, you cannot edit until reviewed."
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total hours</span>
              <span className="font-bold">{formatHours(totalHours)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Billable</span>
              <span className="font-bold text-emerald-600">{formatHours(billableHours)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Entries</span>
              <span className="font-bold">{entries.length}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setSubmitModal(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1">
              {saving
                ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <><Send className="w-3.5 h-3.5" /> Submit</>
              }
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}