'use client'

import { useState } from 'react'
import { StatusBadge, StatusType } from '@/components/ui/status-badge'
import { ChevronDown, Check } from 'lucide-react'

interface InlineStatusSelectProps {
  value: StatusType
  onChange: (status: StatusType) => Promise<void>
  disabled?: boolean
}

export function InlineStatusSelect({ value, onChange, disabled = false }: InlineStatusSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const statuses: { value: StatusType; label: string }[] = [
    { value: 'not_started', label: '未着手' },
    { value: 'waiting_confirmation', label: '確認待ち' },
    { value: 'in_progress', label: '進行中' },
    { value: 'completed', label: '完了' }
  ]

  const handleChange = async (newStatus: StatusType) => {
    if (newStatus === value || isLoading) return
    
    setIsLoading(true)
    try {
      await onChange(newStatus)
      setIsOpen(false)
    } catch (error) {
      console.error('ステータス更新エラー:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className={`
          flex items-center gap-1 
          ${isLoading ? 'opacity-50 cursor-wait' : ''}
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
          transition-transform duration-200
        `}
      >
        <StatusBadge status={value} size="sm" />
        {!disabled && (
          <ChevronDown className={`h-3 w-3 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full mt-1 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden min-w-[150px]">
            {statuses.map((status) => (
              <button
                key={status.value}
                onClick={() => handleChange(status.value)}
                className={`
                  w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 
                  transition-colors flex items-center justify-between
                  ${status.value === value ? 'bg-gray-50 dark:bg-gray-700' : ''}
                `}
              >
                <StatusBadge status={status.value} size="sm" />
                {status.value === value && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}