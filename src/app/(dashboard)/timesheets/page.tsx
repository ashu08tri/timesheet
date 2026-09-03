'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { startOfWeek } from 'date-fns'
import { Header } from '@/components/layout/Header'
import { WeekNavigator } from '@/components/timesheet/WeekNavigator'
import { TimesheetEditor } from '@/components/timesheet/TimesheetEditor'
import { Table2, RotateCcw } from 'lucide-react'

interface Project { id: string; name: string; code: string; color: string }

function TimesheetsInner() {
  const searchParams = useSearchParams()
  const weekParam = searchParams.get('week')

  const [weekStart, setWeekStart] = useState<Date>(
    () => (weekParam ? startOfWeek(new Date(weekParam), { weekStartsOn: 1 }) : startOfWeek(new Date(), { weekStartsOn: 1 }))
  )
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    if (weekParam) setWeekStart(startOfWeek(new Date(weekParam), { weekStartsOn: 1 }))
  }, [weekParam])

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(setProjects)
  }, [])

  return (
    <>
      <Header
        title="Timesheets"
        subtitle="Log your daily work hours by project"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/timesheets/reverted" className="btn-secondary text-sm flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" /> Reverted Entries
            </Link>
            <Link href="/timesheets/entries" className="btn-secondary text-sm flex items-center gap-1.5">
              <Table2 className="w-4 h-4" /> My Entries
            </Link>
            <WeekNavigator weekStart={weekStart} onChange={setWeekStart} />
          </div>
        }
      />
      <TimesheetEditor weekStart={weekStart} projects={projects} />
    </>
  )
}

export default function TimesheetsPage() {
  return (
    <Suspense fallback={null}>
      <TimesheetsInner />
    </Suspense>
  )
}
