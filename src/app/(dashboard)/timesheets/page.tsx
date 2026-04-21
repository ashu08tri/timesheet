'use client'
import { useState, useEffect } from 'react'
import { startOfWeek } from 'date-fns'
import { Header } from '@/components/layout/Header'
import { WeekNavigator } from '@/components/timesheet/WeekNavigator'
import { TimesheetEditor } from '@/components/timesheet/TimesheetEditor'

interface Project { id: string; name: string; code: string; color: string }

export default function TimesheetsPage() {
  const [weekStart, setWeekStart] = useState<Date>(
    () => startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(setProjects)
  }, [])

  return (
    <>
      <Header
        title="Timesheets"
        subtitle="Log your daily work hours by project"
        actions={
          <WeekNavigator weekStart={weekStart} onChange={setWeekStart} />
        }
      />
      <TimesheetEditor weekStart={weekStart} projects={projects} />
    </>
  )
}
