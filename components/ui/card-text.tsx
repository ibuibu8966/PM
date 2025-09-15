import { cn } from '@/lib/utils'

interface CardTextProps {
  children: React.ReactNode
  className?: string
  lines?: 1 | 2 | 3
}

export function CardText({ children, className, lines = 2 }: CardTextProps) {
  const lineClampClass = {
    1: 'line-clamp-1',
    2: 'line-clamp-2',
    3: 'line-clamp-3'
  }[lines]

  return (
    <div className={cn(
      'break-words overflow-hidden',
      lineClampClass,
      className
    )}>
      {children}
    </div>
  )
}