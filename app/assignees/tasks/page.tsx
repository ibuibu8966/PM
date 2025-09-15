'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CardText } from '@/components/ui/card-text'
import { Badge } from '@/components/ui/badge'
import { StatusBadge, StatusType } from '@/components/ui/status-badge'
import { InlineStatusSelect } from '@/components/ui/inline-status-select'
import { PriorityIndicator } from '@/components/ui/priority-indicator'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card-detail'
import { useToast } from '@/contexts/toast-context'
import { Button } from '@/components/ui/button'
import { CheckSquare, Edit2 } from 'lucide-react'
import { Calendar, Users, AlertCircle, CheckCircle2, Clock, User } from 'lucide-react'
import Link from 'next/link'

type Assignee = {
  id: string
  name: string
}

type Task = {
  id: string
  title: string
  description?: string
  status: StatusType
  priority: number
  deadline?: string
  project_id: string
  assignee_id?: string
  project?: {
    id: string
    name: string
  }
}

type AssigneeWithTasks = Assignee & {
  tasks: Task[]
  stats: {
    total: number
    notStarted: number
    inProgress: number
    waitingConfirmation: number
    completed: number
    overdue: number
  }
}

export default function AssigneeTasksPage() {
  const [assigneesWithTasks, setAssigneesWithTasks] = useState<AssigneeWithTasks[]>([])
  const [unassignedTasks, setUnassignedTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const { showToast } = useToast()

  useEffect(() => {
    fetchAssigneeTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchAssigneeTasks = async () => {
    try {
      // 担当者一覧を取得
      const { data: assignees, error: assigneesError } = await supabase
        .from('assignees')
        .select('*')
        .order('name')

      if (assigneesError) throw assigneesError

      // タスクを取得（プロジェクト情報も含む）
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects(id, name)
        `)
        .order('deadline')
        .order('priority', { ascending: false })

      if (tasksError) throw tasksError

      // 担当者ごとにタスクをグループ化
      const assigneeMap: { [key: string]: AssigneeWithTasks } = {}
      const unassigned: Task[] = []

      // 初期化
      assignees?.forEach((assignee: Assignee) => {
        assigneeMap[assignee.id] = {
          ...assignee,
          tasks: [],
          stats: {
            total: 0,
            notStarted: 0,
            inProgress: 0,
            waitingConfirmation: 0,
            completed: 0,
            overdue: 0
          }
        }
      })

      // タスクを振り分け
      const today = new Date()
      tasks?.forEach((task: Task) => {
        if (task.assignee_id && assigneeMap[task.assignee_id]) {
          const assignee = assigneeMap[task.assignee_id]
          assignee.tasks.push(task)
          assignee.stats.total++

          // ステータス別カウント
          switch (task.status) {
            case 'not_started':
              assignee.stats.notStarted++
              break
            case 'in_progress':
              assignee.stats.inProgress++
              break
            case 'waiting_confirmation':
              assignee.stats.waitingConfirmation++
              break
            case 'completed':
              assignee.stats.completed++
              break
          }

          // 期限切れチェック
          if (task.deadline && new Date(task.deadline) < today && task.status !== 'completed') {
            assignee.stats.overdue++
          }
        } else if (!task.assignee_id) {
          unassigned.push(task)
        }
      })

      setAssigneesWithTasks(Object.values(assigneeMap).filter(a => a.tasks.length > 0))
      setUnassignedTasks(unassigned)
    } catch (error) {
      console.error('Error fetching assignee tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTaskStatusUpdate = async (taskId: string, newStatus: StatusType) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)

      if (error) throw error

      // ローカルステートを更新
      setAssigneesWithTasks(prev => prev.map(assignee => ({
        ...assignee,
        tasks: assignee.tasks.map(t =>
          t.id === taskId ? { ...t, status: newStatus } : t
        )
      })))

      setUnassignedTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: newStatus } : t
      ))

      showToast('ステータスを更新しました', 'success')
    } catch (error) {
      console.error('ステータス更新エラー:', error)
      showToast('ステータスの更新に失敗しました', 'error')
    }
  }

  const getDeadlineColor = (deadline?: string) => {
    if (!deadline) return ''
    const days = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (days < 0) return 'text-red-600 font-bold'
    if (days <= 3) return 'text-orange-600'
    return 'text-gray-600'
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">読み込み中...</div>
  }

  return (
    <div>
      <p className="text-gray-600 mb-6">誰にどのタスクを振ったかを確認できます</p>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">全タスク</p>
                <p className="text-2xl font-bold">
                  {assigneesWithTasks.reduce((sum, a) => sum + a.stats.total, 0) + unassignedTasks.length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">進行中</p>
                <p className="text-2xl font-bold">
                  {assigneesWithTasks.reduce((sum, a) => sum + a.stats.inProgress, 0)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">期限切れ</p>
                <p className="text-2xl font-bold text-red-600">
                  {assigneesWithTasks.reduce((sum, a) => sum + a.stats.overdue, 0)}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">未割り当て</p>
                <p className="text-2xl font-bold">
                  {unassignedTasks.length}
                </p>
              </div>
              <User className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 担当者別タスク一覧 */}
      <div className="space-y-6">
        {assigneesWithTasks.map(assignee => (
          <Card key={assignee.id} className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-xl">{assignee.name}</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    全{assignee.stats.total}件
                  </Badge>
                  {assignee.stats.overdue > 0 && (
                    <Badge variant="destructive">
                      期限切れ {assignee.stats.overdue}件
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-4 mt-3 text-sm">
                <span className="text-gray-600">
                  未着手: <strong>{assignee.stats.notStarted}</strong>
                </span>
                <span className="text-blue-600">
                  進行中: <strong>{assignee.stats.inProgress}</strong>
                </span>
                <span className="text-orange-600">
                  確認待ち: <strong>{assignee.stats.waitingConfirmation}</strong>
                </span>
                <span className="text-green-600">
                  完了: <strong>{assignee.stats.completed}</strong>
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {assignee.tasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Link href={`/tasks/${task.id}`}>
                            <h3 className="font-medium hover:text-blue-600 cursor-pointer">
                              <CardText lines={1}>{task.title}</CardText>
                            </h3>
                          </Link>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-96" align="start">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-2">
                                <CheckSquare className="h-5 w-5 text-blue-600 mt-0.5" />
                                <div>
                                  <h4 className="text-base font-semibold">
                                    <CardText lines={2}>{task.title}</CardText>
                                  </h4>
                                  {task.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      <CardText lines={3}>{task.description}</CardText>
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Link href={`/tasks/${task.id}/edit`}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">ステータス:</span>
                                <div className="mt-1">
                                  <StatusBadge status={task.status} />
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">優先度:</span>
                                <div className="mt-1">
                                  <PriorityIndicator priority={task.priority} />
                                </div>
                              </div>
                              {task.deadline && (
                                <div>
                                  <span className="text-muted-foreground">期限:</span>
                                  <div className="mt-1 flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {new Date(task.deadline).toLocaleDateString('ja-JP')}
                                  </div>
                                </div>
                              )}
                              {task.project && (
                                <div>
                                  <span className="text-muted-foreground">プロジェクト:</span>
                                  <div className="mt-1">
                                    <Link href={`/projects/${task.project.id}`}>
                                      <span className="text-blue-600 hover:underline">{task.project.name}</span>
                                    </Link>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                      <div className="flex items-center gap-3 mt-1">
                        <PriorityIndicator priority={task.priority} size="sm" />
                        {task.project && (
                          <span className="text-xs text-gray-600">
                            {task.project.name}
                          </span>
                        )}
                        {task.deadline && (
                          <span className={`text-xs flex items-center gap-1 ${getDeadlineColor(task.deadline)}`}>
                            <Calendar className="h-3 w-3" />
                            {new Date(task.deadline).toLocaleDateString('ja-JP')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <InlineStatusSelect
                        value={task.status}
                        onChange={(newStatus) => handleTaskStatusUpdate(task.id, newStatus)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* 未割り当てタスク */}
        {unassignedTasks.length > 0 && (
          <Card className="overflow-hidden border-gray-300">
            <CardHeader className="bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-600" />
                  <CardTitle className="text-xl text-gray-700">未割り当て</CardTitle>
                </div>
                <Badge variant="secondary">
                  {unassignedTasks.length}件
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {unassignedTasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <Link href={`/tasks/${task.id}`}>
                        <h3 className="font-medium hover:text-blue-600 cursor-pointer">
                          {task.title}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-3 mt-1">
                        <PriorityIndicator priority={task.priority} size="sm" />
                        {task.project && (
                          <span className="text-xs text-gray-600">
                            {task.project.name}
                          </span>
                        )}
                        {task.deadline && (
                          <span className={`text-xs flex items-center gap-1 ${getDeadlineColor(task.deadline)}`}>
                            <Calendar className="h-3 w-3" />
                            {new Date(task.deadline).toLocaleDateString('ja-JP')}
                          </span>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={task.status} size="sm" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {assigneesWithTasks.length === 0 && unassignedTasks.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500">タスクがありません</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}