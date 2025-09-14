import { Flame, TrendingUp, Minus } from 'lucide-react'

interface PriorityIndicatorProps {
  priority: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function PriorityIndicator({ priority, showLabel = true, size = 'md' }: PriorityIndicatorProps) {
  const getPriorityConfig = (priority: number) => {
    if (priority >= 8) {
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-400',
        icon: Flame,
        label: '最優先'
      }
    }
    if (priority >= 5) {
      return {
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        borderColor: 'border-orange-400',
        icon: TrendingUp,
        label: '高'
      }
    }
    return {
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-400',
      icon: Minus,
      label: '通常'
    }
  }

  const config = getPriorityConfig(priority)
  const Icon = config.icon

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${config.bgColor} ${config.borderColor} border ${sizeClasses[size]}`}>
      <Icon className={`${config.color} ${iconSizes[size]}`} />
      <span className={`font-semibold ${config.color}`}>
        {priority}
      </span>
      {showLabel && (
        <span className={`${config.color} ml-1`}>
          ({config.label})
        </span>
      )}
    </div>
  )
}