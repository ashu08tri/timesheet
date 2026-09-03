'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { formatHours } from '@/lib/utils'
import { format } from 'date-fns'
import { ArrowLeft, AlertCircle, Pencil, ChevronRight } from 'lucide-react'

interface RevertedEntry {
  id: string; date: string; hours: number; description: string | null
  project: { id: string; name: string; code: string; color: string }
}
interface RevertedTimesheet {
  id: string; weekStart: string; weekEnd: string; totalHours: number
  reviewNotes: string | null; reviewedAt: string | null
  user: { id: string; name: string }
  reviewer: { id: string; name: string } | null
  entries: RevertedEntry[]
  approvalActions: { comments: string | null; createdAt: string; actor: { name: string } }[]
}

export default function RevertedEntriesPage() {
  const [items, setItems] = useState<RevertedTimesheet[]>([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<RevertedTimesheet | null>(null)

  useEffect(() => {
    fetch('/api/timesheets/reverted?scope=mine')
      .then(res => res.json())
      .then(setItems)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  return (
    <>
      <Link href="/timesheets" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Timesheets
      </Link>
      <Header title="Reverted Entries" subtitle="Weeks sent back to you for correction — review the comments and resubmit" />

      {!items.length ? (
        <div className="card p-10 text-center text-gray-400 text-sm">
          Nothing reverted right now — you&apos;re all caught up.
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-left text-xs text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="p-4">Week Of</th><th className="p-4">Hours</th><th className="p-4">Reverted By</th>
                <th className="p-4">Comments</th><th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map(ts => (
                <tr key={ts.id}>
                  <td className="p-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    {format(new Date(ts.weekStart), 'MMM d')} – {format(new Date(ts.weekEnd), 'MMM d, yyyy')}
                  </td>
                  <td className="p-4 tabular-nums">{formatHours(ts.totalHours)}</td>
                  <td className="p-4 text-gray-500">{ts.reviewer?.name ?? '—'}</td>
                  <td className="p-4 text-gray-500 max-w-xs truncate flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    {ts.reviewNotes || '—'}
                  </td>
                  <td className="p-4 text-right space-x-1 whitespace-nowrap">
                    <button onClick={() => setDetail(ts)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 inline-flex items-center gap-1 text-xs font-semibold text-gray-500">
                      View <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <Link
                      href={`/timesheets?week=${format(new Date(ts.weekStart), 'yyyy-MM-dd')}`}
                      className="btn-primary !py-1.5 !px-3 text-xs inline-flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" /> Resubmit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Week of ${format(new Date(detail.weekStart), 'MMM d, yyyy')}` : ''}
        description="Reverted entry details"
        size="lg"
      >
        {detail && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
              <p className="font-semibold mb-1">Comments from {detail.reviewer?.name ?? 'reviewer'}</p>
              <p>{detail.reviewNotes || 'No comments provided.'}</p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {detail.entries.map(e => (
                <div key={e.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: e.project.color }} />
                    <span className="text-gray-900 dark:text-white">{e.project.name}</span>
                    <span className="text-gray-400 text-xs">{format(new Date(e.date), 'EEE, MMM d')}</span>
                  </div>
                  <span className="font-semibold tabular-nums">{formatHours(e.hours)}</span>
                </div>
              ))}
            </div>
            <Link
              href={`/timesheets?week=${format(new Date(detail.weekStart), 'yyyy-MM-dd')}`}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Pencil className="w-4 h-4" /> Edit &amp; Resubmit This Week
            </Link>
          </div>
        )}
      </Modal>
    </>
  )
}
