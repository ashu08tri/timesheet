import { cn, getStatusColor, getStatusLabel } from '@/lib/utils'
import { CheckCircle2, Clock3, AlertCircle, Send, FileEdit } from 'lucide-react'

const icons: Record<string, React.ElementType> = {
  DRAFT:     FileEdit,
  SUBMITTED: Send,
  IN_REVIEW: Clock3,
  APPROVED:  CheckCircle2,
  REJECTED:  AlertCircle,
}

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const Icon = icons[status] ?? FileEdit
  return (
    <span className={cn(
      'status-badge',
      getStatusColor(status),
      size === 'sm' && 'text-[10px] px-2 py-0.5'
    )}>
      <Icon className={cn('shrink-0', size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
      {getStatusLabel(status)}
    </span>
  )
}
