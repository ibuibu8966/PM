'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown, X, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Input } from './input'
import { Badge } from './badge'

interface Option {
  id: string
  name: string
}

interface SearchableMultiSelectProps {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  disabled?: boolean
}

export function SearchableMultiSelect({
  options,
  selected,
  onChange,
  placeholder = "選択してください",
  searchPlaceholder = "検索...",
  className,
  disabled = false
}: SearchableMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleOption = (optionId: string) => {
    const newSelected = selected.includes(optionId)
      ? selected.filter(id => id !== optionId)
      : [...selected, optionId]
    onChange(newSelected)
  }

  const removeOption = (optionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selected.filter(id => id !== optionId))
  }

  const selectedOptions = options.filter(option => selected.includes(option.id))

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        className={cn(
          "w-full justify-between min-h-[40px] h-auto",
          selected.length > 0 && "py-2"
        )}
        onClick={() => setOpen(!open)}
      >
        <div className="flex flex-wrap gap-1 items-center flex-1 text-left">
          {selected.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selectedOptions.map(option => (
              <Badge
                key={option.id}
                variant="secondary"
                className="mr-1"
              >
                {option.name}
                <button
                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onClick={(e) => removeOption(option.id, e)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          )}
        </div>
        <ChevronDown className={cn(
          "ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform",
          open && "rotate-180"
        )} />
      </Button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg">
          <div className="p-2 border-b">
            <div className="flex items-center px-2">
              <Search className="h-4 w-4 text-muted-foreground mr-2" />
              <Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 border-0 focus:ring-0 p-0 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="max-h-60 overflow-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                該当する項目がありません
              </div>
            ) : (
              filteredOptions.map(option => (
                <button
                  key={option.id}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                    selected.includes(option.id) && "bg-accent/50"
                  )}
                  onClick={() => toggleOption(option.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.includes(option.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.name}
                </button>
              ))
            )}
          </div>

          {filteredOptions.length > 0 && (
            <div className="border-t p-2 text-xs text-muted-foreground">
              {selected.length}個選択中 / 全{options.length}個
            </div>
          )}
        </div>
      )}
    </div>
  )
}