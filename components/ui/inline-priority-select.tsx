'use client'

import { useState } from 'react'
import { PriorityIndicator } from '@/components/ui/priority-indicator'
import { ChevronDown, Check } from 'lucide-react'

interface InlinePrioritySelectProps {
  value: number
  onChange: (priority: number) => Promise<void>
  disabled?: boolean
}

export function InlinePrioritySelect({ value, onChange, disabled = false }: InlinePrioritySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const priorities = [
    { value: 10, label: '最優先' },
    { value: 9, label: '緊急' },
    { value: 8, label: '非常に高い' },
    { value: 7, label: '高い' },
    { value: 6, label: 'やや高い' },
    { value: 5, label: '通常' },
    { value: 4, label: 'やや低い' },
    { value: 3, label: '低い' },
    { value: 2, label: '非常に低い' },
    { value: 1, label: '最低' },
    { value: 0, label: '保留' }
  ]

  const handleChange = async (newPriority: number) => {
    if (newPriority === value || isLoading) return
    
    setIsLoading(true)
    try {
      await onChange(newPriority)
      setIsOpen(false)
    } catch (error) {
      console.error('優先度更新エラー:', error)
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
        <PriorityIndicator priority={value} size="sm" showLabel={false} />
        {!disabled && (
          <ChevronDown className={`h-3 w-3 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full mt-1 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden min-w-[200px] max-h-[300px] overflow-y-auto">
            {priorities.map((priority) => (
              <button
                key={priority.value}
                onClick={() => handleChange(priority.value)}
                className={`
                  w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 
                  transition-colors flex items-center justify-between gap-2
                  ${priority.value === value ? 'bg-gray-50 dark:bg-gray-700' : ''}
                `}
              >
                <div className="flex items-center gap-2">
                  <PriorityIndicator priority={priority.value} size="sm" showLabel={false} />
                  <span className="text-sm">{priority.label}</span>
                </div>
                {priority.value === value && (
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}