import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle2, AlertCircle, CircleDot } from 'lucide-react'

export type StatusType = 'not_started' | 'waiting_confirmation' | 'in_progress' | 'completed'

interface StatusBadgeProps {
  status: StatusType
  size?: 'sm' | 'md' | 'lg'
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const statusConfig = {
    not_started: {
      label: '未着手',
      icon: CircleDot,
      className: 'bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-400 font-semibold'
    },
    waiting_confirmation: {
      label: '確認待ち',
      icon: Clock,
      className: 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-500 font-semibold'
    },
    in_progress: {
      label: '進行中',
      icon: AlertCircle,
      className: 'bg-blue-50 text-blue-800 hover:bg-blue-100 border-blue-500 font-semibold'
    },
    completed: {
      label: '完了',
      icon: CheckCircle2,
      className: 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-500 font-semibold'
    }
  }

  const config = statusConfig[status] || statusConfig.not_started
  const Icon = config.icon
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  }

  return (
    <Badge className={`${config.className} ${sizeClasses[size]} border transition-all duration-200 flex items-center gap-1 font-medium`}>
      <Icon className={size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      {config.label}
    </Badge>
  )
}