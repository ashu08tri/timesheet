'use client'
import { useState } from 'react'
import { Trash2, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Project {
  id: string
  name: string
  code: string
  color: string
}

interface EntryRowProps {
  entry: {
    id?: string
    projectId: string
    hours: number
    description: string
    isBillable: boolean
    date: string
  }
  projects: Project[]
  dayLabel: string
  isWeekend?: boolean
  readOnly?: boolean
  onUpdate: (field: string, value: string | number | boolean) => void
  onDelete: () => void
}

export function EntryRow({ entry, projects, dayLabel, isWeekend, readOnly, onUpdate, onDelete }: EntryRowProps) {
  const [focused, setFocused] = useState(false)
  const selectedProject = projects.find(p => p.id === entry.projectId)

  return (
    <div className={cn(
      'entry-row grid grid-cols-[140px_1fr_100px_36px] gap-2 items-center p-2 rounded-xl',
      focused && 'bg-brand-50/50 dark:bg-brand-950/20',
      isWeekend && 'opacity-60',
    )}>
      <div className="flex items-center gap-2">
        <div
          className="w-1.5 h-8 rounded-full shrink-0"
          style={{ background: selectedProject?.color ?? '#e5e7eb' }}
        />
        <div>
          <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{dayLabel}</p>
          {selectedProject && (
            <p className="text-[10px] text-gray-400 truncate max-w-[100px]">{selectedProject.name}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 min-w-0">
        {readOnly ? (
          <span className="text-sm text-gray-700 dark:text-gray-300">{selectedProject?.name}</span>
        ) : (
          <select
            value={entry.projectId}
            onChange={e => onUpdate('projectId', e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="input text-xs py-1.5 flex-shrink-0 w-36"
            disabled={readOnly}
          >
            <option value="">— Project —</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        <input
          type="text"
          value={entry.description}
          onChange={e => onUpdate('description', e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="What did you work on?"
          className="input text-xs py-1.5 flex-1 min-w-0"
          disabled={readOnly}
        />
      </div>

      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={entry.hours || ''}
          onChange={e => onUpdate('hours', parseFloat(e.target.value) || 0)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="0"
          min="0"
          max="24"
          step="0.5"
          className={cn(
            'input text-xs py-1.5 w-16 text-center tabular-nums',
            entry.hours > 8 && 'border-amber-400 dark:border-amber-600'
          )}
          disabled={readOnly}
        />
        <button
          type="button"
          onClick={() => !readOnly && onUpdate('isBillable', !entry.isBillable)}
          title={entry.isBillable ? 'Billable' : 'Non-billable'}
          className={cn(
            'w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0',
            entry.isBillable
              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
              : 'bg-gray-100 text-gray-400 dark:bg-gray-800'
          )}
          disabled={readOnly}
        >
          <DollarSign className="w-3 h-3" />
        </button>
      </div>

      {!readOnly && (
        <button
          type="button"
          onClick={onDelete}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-300
                     hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}