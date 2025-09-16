'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Input } from './input'

interface Option {
  id: string
  name: string
}

interface SearchableSelectProps {
  options: Option[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  disabled?: boolean
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "選択してください",
  searchPlaceholder = "検索...",
  className,
  disabled = false
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedOption = options.find(option => option.id === value)

  const handleSelect = (optionId: string) => {
    onChange(optionId)
    setOpen(false)
    setSearchQuery('')
  }

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        className="w-full justify-between"
        onClick={() => setOpen(!open)}
      >
        <span className={cn("block truncate", !selectedOption && "text-muted-foreground")}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDown className={cn(
          "ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform",
          open && "rotate-180"
        )} />
      </Button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border rounded-md shadow-lg">
          <div className="p-2 border-b bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center px-2">
              <Search className="h-4 w-4 text-muted-foreground mr-2" />
              <Input
                ref={inputRef}
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 border-0 focus:ring-0 p-0 text-sm bg-transparent"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="max-h-60 overflow-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                該当するプロジェクトがありません
              </div>
            ) : (
              filteredOptions.map(option => (
                <button
                  key={option.id}
                  type="button"
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                    value === option.id && "bg-accent/50"
                  )}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleSelect(option.id)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{option.name}</span>
                </button>
              ))
            )}
          </div>

          {filteredOptions.length > 0 && (
            <div className="border-t p-2 text-xs text-muted-foreground">
              全{options.length}個のプロジェクト
            </div>
          )}
        </div>
      )}
    </div>
  )
}