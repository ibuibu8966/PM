'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Project, Task } from '@/lib/types/database'
import { format, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface GanttChartProps {
  projects: Project[]
  tasks: Task[]
}

export function GanttChart({ projects, tasks }: GanttChartProps) {
  const [startDate, setStartDate] = useState(new Date())
  const [endDate, setEndDate] = useState(new Date())
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  useEffect(() => {
    // 全タスク・プロジェクトの最小・最大日付を計算
    const allDates: Date[] = []

    projects.forEach(p => {
      if (p.deadline) allDates.push(new Date(p.deadline))
      allDates.push(new Date(p.created_at))
    })

    tasks.forEach(t => {
      if (t.deadline) allDates.push(new Date(t.deadline))
      allDates.push(new Date(t.created_at))
    })

    if (allDates.length > 0) {
      const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
      const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))

      setStartDate(startOfMonth(minDate))
      setEndDate(endOfMonth(maxDate))
    } else {
      const now = new Date()
      setStartDate(startOfMonth(now))
      setEndDate(endOfMonth(new Date(now.getFullYear(), now.getMonth() + 2)))
    }
  }, [projects, tasks])

  const days = eachDayOfInterval({ start: startDate, end: endDate })
  const months: { month: string; days: number }[] = []

  let currentMonth = ''
  let daysInMonth = 0

  days.forEach(day => {
    const monthStr = format(day, 'yyyy年MM月', { locale: ja })
    if (monthStr !== currentMonth) {
      if (currentMonth) {
        months.push({ month: currentMonth, days: daysInMonth })
      }
      currentMonth = monthStr
      daysInMonth = 1
    } else {
      daysInMonth++
    }
  })

  if (currentMonth) {
    months.push({ month: currentMonth, days: daysInMonth })
  }

  const getItemPosition = (startDate: Date, endDate: Date | null) => {
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : new Date()

    const startDiff = differenceInDays(start, days[0])
    const duration = differenceInDays(end, start) + 1

    return {
      left: Math.max(0, startDiff) * 30,
      width: Math.max(30, duration * 30)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500 dark:bg-emerald-600'
      case 'in_progress': return 'bg-blue-500 dark:bg-blue-600'
      case 'waiting_confirmation': return 'bg-amber-500 dark:bg-amber-600'
      default: return 'bg-gray-500 dark:bg-gray-600'
    }
  }

  const today = new Date()

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">ガントチャート</h2>

      <ScrollArea className="w-full">
        <div className="min-w-max">
          {/* ヘッダー：月表示 */}
          <div className="flex border-b dark:border-gray-700">
            <div className="w-48 flex-shrink-0 p-2 font-semibold border-r dark:border-gray-700">
              項目
            </div>
            <div className="flex">
              {months.map((month, index) => (
                <div
                  key={index}
                  className="border-r dark:border-gray-700 text-center text-sm font-medium p-2"
                  style={{ width: month.days * 30 }}
                >
                  {month.month}
                </div>
              ))}
            </div>
          </div>

          {/* ヘッダー：日付表示 */}
          <div className="flex border-b dark:border-gray-700">
            <div className="w-48 flex-shrink-0 p-2 border-r dark:border-gray-700">
              <span className="text-xs text-muted-foreground">ステータス / 優先度</span>
            </div>
            <div className="flex relative">
              {days.map((day, index) => (
                <div
                  key={index}
                  className={cn(
                    "w-[30px] border-r dark:border-gray-700 text-center text-xs p-1",
                    isSameDay(day, today) && "bg-primary/10 font-bold"
                  )}
                >
                  {format(day, 'd')}
                </div>
              ))}
            </div>
          </div>

          {/* プロジェクト行 */}
          {projects.map(project => {
            const projectTasks = tasks.filter(t => t.project_id === project.id)
            const position = getItemPosition(
              new Date(project.created_at),
              project.deadline ? new Date(project.deadline) : null
            )

            return (
              <div key={project.id}>
                {/* プロジェクト */}
                <div className="flex border-b dark:border-gray-700 h-12 relative">
                  <div className="w-48 flex-shrink-0 p-2 border-r dark:border-gray-700 flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{project.name}</span>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs">
                        P{project.priority}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex-1 relative">
                    <div
                      className={cn(
                        "absolute top-2 h-8 rounded-md flex items-center px-2 text-xs text-white font-medium cursor-pointer transition-opacity",
                        getStatusColor(project.status),
                        hoveredItem === project.id ? "opacity-100" : "opacity-80"
                      )}
                      style={{
                        left: `${position.left}px`,
                        width: `${position.width}px`
                      }}
                      onMouseEnter={() => setHoveredItem(project.id)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <span className="truncate">{project.name}</span>
                    </div>
                  </div>
                </div>

                {/* タスク */}
                {projectTasks.map(task => {
                  const taskPosition = getItemPosition(
                    new Date(task.created_at),
                    task.deadline ? new Date(task.deadline) : null
                  )

                  return (
                    <div key={task.id} className="flex border-b dark:border-gray-700 h-10 relative">
                      <div className="w-48 flex-shrink-0 p-2 pl-8 border-r dark:border-gray-700 flex items-center justify-between">
                        <span className="text-sm truncate text-muted-foreground">
                          {task.title}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {task.priority}
                        </Badge>
                      </div>
                      <div className="flex-1 relative">
                        <div
                          className={cn(
                            "absolute top-1.5 h-7 rounded-md flex items-center px-2 text-xs text-white cursor-pointer transition-opacity",
                            getStatusColor(task.status),
                            hoveredItem === task.id ? "opacity-100" : "opacity-70"
                          )}
                          style={{
                            left: `${taskPosition.left}px`,
                            width: `${taskPosition.width}px`
                          }}
                          onMouseEnter={() => setHoveredItem(task.id)}
                          onMouseLeave={() => setHoveredItem(null)}
                        >
                          <span className="truncate">{task.title}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* 今日のライン */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
            style={{
              left: `${248 + differenceInDays(today, days[0]) * 30 + 15}px`
            }}
          />
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* 凡例 */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-500 dark:bg-gray-600" />
          <span>未着手</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-500 dark:bg-amber-600" />
          <span>確認待ち</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500 dark:bg-blue-600" />
          <span>進行中</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-500 dark:bg-emerald-600" />
          <span>完了</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-4 bg-red-500" />
          <span>今日</span>
        </div>
      </div>
    </Card>
  )
}