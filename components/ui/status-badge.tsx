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
      className: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'
    },
    waiting_confirmation: { 
      label: '確認待ち', 
      icon: Clock,
      className: 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-300'
    },
    in_progress: { 
      label: '進行中', 
      icon: AlertCircle,
      className: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300'
    },
    completed: { 
      label: '完了', 
      icon: CheckCircle2,
      className: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-300'
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