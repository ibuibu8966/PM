import { CheckCircle, X, AlertCircle, Info } from 'lucide-react'
import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  message: string
  type: ToastType
  duration?: number
  onClose?: () => void
}

export function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true)
      setTimeout(() => {
        setIsVisible(false)
        onClose?.()
      }, 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  if (!isVisible) return null

  const typeConfig = {
    success: {
      icon: CheckCircle,
      className: 'bg-emerald-500 dark:bg-emerald-600',
    },
    error: {
      icon: X,
      className: 'bg-red-500 dark:bg-red-600',
    },
    warning: {
      icon: AlertCircle,
      className: 'bg-amber-500 dark:bg-amber-600',
    },
    info: {
      icon: Info,
      className: 'bg-blue-500 dark:bg-blue-600',
    },
  }

  const config = typeConfig[type]
  const Icon = config.icon

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
        text-white font-medium transition-all duration-300
        ${config.className}
        ${isLeaving ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}
      `}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="text-sm">{message}</span>
      <button
        onClick={() => {
          setIsLeaving(true)
          setTimeout(() => {
            setIsVisible(false)
            onClose?.()
          }, 300)
        }}
        className="ml-2 hover:opacity-80 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}