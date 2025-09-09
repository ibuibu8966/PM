'use client'

import { Button } from '@/components/ui/button'
import { ReactNode, useState } from 'react'

interface ActionButtonProps {
  icon: ReactNode
  label: string
  onClick?: () => void
  href?: string
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  tooltip?: string
  className?: string
  disabled?: boolean
}

export function ActionButton({
  icon,
  label,
  onClick,
  href,
  variant = 'default',
  size = 'md',
  tooltip,
  className = '',
  disabled = false
}: ActionButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-base gap-2',
    lg: 'px-5 py-2.5 text-lg gap-2.5'
  }

  const variantColors = {
    default: 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg',
    secondary: 'bg-secondary hover:bg-secondary/80 text-secondary-foreground',
    outline: 'border-2 hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    destructive: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
  }

  const buttonContent = (
    <div className="relative">
      <Button
        variant={variant}
        onClick={onClick}
        disabled={disabled}
        className={`
          ${sizeClasses[size]} 
          ${variantColors[variant]}
          transition-all duration-200 
          font-medium 
          rounded-lg
          flex items-center
          ${className}
        `}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {icon}
        <span>{label}</span>
      </Button>
      
      {tooltip && showTooltip && !disabled && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-50">
          {tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <a href={href} className="inline-block">
        {buttonContent}
      </a>
    )
  }

  return buttonContent
}