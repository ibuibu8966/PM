import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { PriorityIndicator } from '@/components/ui/priority-indicator'
import { Calendar, AlertTriangle, Flame, Clock } from 'lucide-react'
import { Task } from '@/lib/types/database'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface TaskCardProps {
  task: Task
  projectName?: string
}

export function TaskCard({ task, projectName }: TaskCardProps) {
  const now = new Date()
  const deadline = task.deadline ? new Date(task.deadline) : null
  const isOverdue = deadline && deadline < now && task.status !== 'completed'
  const isHighPriority = task.priority >= 8
  const isUrgent = deadline && Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) <= 3

  return (
    <Link href={`/tasks/${task.id}`}>
      <Card
        className={cn(
          "group hover:shadow-lg transition-all duration-200 cursor-pointer relative overflow-hidden",
          isOverdue && "border-red-500 dark:border-red-600 border-2 bg-red-50/50 dark:bg-red-950/20",
          isHighPriority && !isOverdue && "border-orange-400 dark:border-orange-600 border-2 bg-orange-50/30 dark:bg-orange-950/20",
          isUrgent && !isOverdue && !isHighPriority && "border-amber-400 dark:border-amber-600 border-2"
        )}
      >
        {/* 重要度インジケーター */}
        {(isOverdue || isHighPriority) && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-500 animate-pulse" />
        )}

        <div className="p-4 md:p-5">
          {/* ヘッダー部分 */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {isOverdue && <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />}
                {isHighPriority && !isOverdue && <Flame className="h-5 w-5 text-orange-500" />}
                {isUrgent && !isOverdue && !isHighPriority && <Clock className="h-5 w-5 text-amber-500" />}
                <h4 className="font-semibold text-base md:text-lg group-hover:text-primary transition-colors line-clamp-2">
                  {task.title}
                </h4>
              </div>
              {projectName && (
                <p className="text-sm text-muted-foreground">{projectName}</p>
              )}
            </div>
            <StatusBadge status={task.status} size="sm" />
          </div>

          {/* 説明文 */}
          {task.description && (
            <p className="text-sm md:text-base text-muted-foreground mb-3 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* フッター情報 */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <PriorityIndicator priority={task.priority} size="sm" showLabel={false} />
              {deadline && (
                <span className={cn(
                  "flex items-center gap-1 text-sm md:text-base",
                  isOverdue && "text-red-600 dark:text-red-400 font-bold",
                  isUrgent && !isOverdue && "text-amber-600 dark:text-amber-400 font-semibold",
                  !isOverdue && !isUrgent && "text-muted-foreground"
                )}>
                  <Calendar className="h-4 w-4" />
                  {deadline.toLocaleDateString('ja-JP')}
                  {isOverdue && <span className="ml-1">期限切れ</span>}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}