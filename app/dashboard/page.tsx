'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Project, Task, UnregisteredTask } from '@/lib/types/database'
import { generateTasksFromRecurring } from '@/lib/utils/recurring-tasks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { PriorityIndicator } from '@/components/ui/priority-indicator'
import { ActionButton } from '@/components/ui/action-button'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Calendar, AlertCircle, FolderOpen, CheckSquare, Users, MessageSquare, ArrowRight, Sparkles, Clock, TrendingUp, Target, Inbox, User, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

type Assignee = {
  id: string
  name: string
}

type AssigneeStats = {
  assignee: Assignee
  taskCount: number
  inProgressCount: number
  overdueCount: number
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [todayTasks, setTodayTasks] = useState<Task[]>([])
  const [unregisteredTasks, setUnregisteredTasks] = useState<UnregisteredTask[]>([])
  const [assigneeStats, setAssigneeStats] = useState<AssigneeStats[]>([])
  const [assignees, setAssignees] = useState<Assignee[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTasks, setExpandedTasks] = useState<{ [key: string]: boolean }>({})
  const [taskForms, setTaskForms] = useState<{
    [key: string]: {
      title: string
      description: string
      projectId: string
      priority: number
      deadline: string
      assigneeId: string
    }
  }>({})
  const supabase = createClient()

  useEffect(() => {
    // 繰り返しタスクから今日のタスクを生成
    generateTasksFromRecurring().then(() => {
      fetchData()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // プロジェクト、タスク、未登録タスク、担当者を並列で取得
      const [projectsResult, tasksResult, highPriorityTasksResult, unregisteredResult, assigneesResult, allTasksResult] = await Promise.all([
        supabase
          .from('projects')
          .select('*')
          .order('priority', { ascending: false })
          .order('deadline', { ascending: true })
          .limit(10),
        supabase
          .from('tasks')
          .select('*')
          .lte('deadline', today)
          .in('status', ['not_started', 'in_progress', 'waiting_confirmation'])
          .order('priority', { ascending: false })
          .order('deadline', { ascending: true }),
        supabase
          .from('tasks')
          .select('*')
          .gte('priority', 8)
          .in('status', ['not_started', 'in_progress', 'waiting_confirmation'])
          .order('priority', { ascending: false })
          .order('deadline', { ascending: true }),
        supabase
          .from('unregistered_tasks')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('assignees')
          .select('*')
          .order('name'),
        supabase
          .from('tasks')
          .select('*')
          .in('status', ['not_started', 'in_progress', 'waiting_confirmation'])
      ])

      if (projectsResult.error) {
        console.error('プロジェクト取得エラー:', projectsResult.error)
        throw projectsResult.error
      }
      if (tasksResult.error) {
        console.error('タスク取得エラー:', tasksResult.error)
        throw tasksResult.error
      }
      if (highPriorityTasksResult.error) {
        console.error('高優先度タスク取得エラー:', highPriorityTasksResult.error)
        throw highPriorityTasksResult.error
      }
      if (unregisteredResult.error) {
        console.error('未登録タスク取得エラー:', unregisteredResult.error)
        throw unregisteredResult.error
      }
      if (assigneesResult.error) {
        console.error('担当者取得エラー:', assigneesResult.error)
        // 担当者テーブルがまだない場合はエラーを無視
        console.log('担当者テーブルが存在しない可能性があります。SQLを実行してください。')
      }
      if (allTasksResult.error) {
        console.error('全タスク取得エラー:', allTasksResult.error)
        throw allTasksResult.error
      }

      setProjects(projectsResult.data || [])

      // 今日のタスクと高優先度タスクを結合（重複を除く）
      const todayTasksData = tasksResult.data || []
      const highPriorityTasksData = highPriorityTasksResult.data || []
      const combinedTasks = [...todayTasksData]
      highPriorityTasksData.forEach((task: Task) => {
        if (!combinedTasks.find(t => t.id === task.id)) {
          combinedTasks.push(task)
        }
      })
      // 優先度順、締切順でソート
      combinedTasks.sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority
        }
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      })

      setTodayTasks(combinedTasks)
      setUnregisteredTasks(unregisteredResult.data || [])

      // 担当者データを設定（エラーの場合は空配列）
      if (!assigneesResult.error && assigneesResult.data) {
        setAssignees(assigneesResult.data)
      } else {
        setAssignees([])
      }

      // 未登録タスクの初期フォームデータを設定
      const initialForms: typeof taskForms = {}
      unregisteredResult.data?.forEach((task: UnregisteredTask) => {
        const lines = task.content.split('\n')
        initialForms[task.id] = {
          title: lines[0] || '',
          description: lines.slice(1).join('\n') || '',
          projectId: '',
          priority: 5,
          deadline: '',
          assigneeId: ''
        }
      })
      setTaskForms(initialForms)

      // 担当者別統計を計算（担当者データがある場合のみ）
      if (!assigneesResult.error && assigneesResult.data) {
        const stats: AssigneeStats[] = []
        const assignees = assigneesResult.data || []
        const allTasks = allTasksResult.data || []
        const now = new Date()

        assignees.forEach((assignee: Assignee) => {
          const assigneeTasks = allTasks.filter((t: Task) => t.assignee_id === assignee.id)
          const inProgress = assigneeTasks.filter((t: Task) => t.status === 'in_progress').length
          const overdue = assigneeTasks.filter((t: Task) =>
            t.deadline && new Date(t.deadline) < now && t.status !== 'completed'
          ).length

          if (assigneeTasks.length > 0) {
            stats.push({
              assignee,
              taskCount: assigneeTasks.length,
              inProgressCount: inProgress,
              overdueCount: overdue
            })
          }
        })

        setAssigneeStats(stats)
      }
      
      // 未登録タスクは現在のスキーマではLINEグループ名のみを持つため、
      // LINEグループ情報の取得はスキップ
    } catch (error) {
      console.error('データ取得エラー:', error)
      console.error('エラー詳細:', (error as Error)?.message || error)
    } finally {
      setLoading(false)
    }
  }

  const toggleTask = (taskId: string) => {
    // タスクフォームがまだ初期化されていない場合は初期化
    if (!taskForms[taskId]) {
      const task = unregisteredTasks.find(t => t.id === taskId)
      if (task) {
        const lines = task.content.split('\n')
        setTaskForms(prev => ({
          ...prev,
          [taskId]: {
            title: lines[0] || '',
            description: lines.slice(1).join('\n') || '',
            projectId: '',
            priority: 5,
            deadline: '',
            assigneeId: ''
          }
        }))
      }
    }

    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }))
  }

  const updateTaskForm = (taskId: string, field: string, value: string | number) => {
    setTaskForms(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [field]: value
      }
    }))
  }

  const assignTask = async (taskId: string) => {
    const form = taskForms[taskId]

    if (!form.projectId) {
      alert('プロジェクトを選択してください')
      return
    }

    if (!form.title) {
      alert('タスク名を入力してください')
      return
    }

    try {
      // タスクを作成
      const { error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: form.title,
          description: form.description || null,
          project_id: form.projectId,
          priority: form.priority,
          deadline: form.deadline || null,
          status: 'not_started',
          assignee_id: form.assigneeId === 'none' || !form.assigneeId ? null : form.assigneeId
        })

      if (taskError) throw taskError

      // 未登録タスクを削除
      const { error: deleteError } = await supabase
        .from('unregistered_tasks')
        .delete()
        .eq('id', taskId)

      if (deleteError) throw deleteError

      // データを再取得
      await fetchData()

      // 展開状態をリセット
      setExpandedTasks(prev => {
        const newExpanded = { ...prev }
        delete newExpanded[taskId]
        return newExpanded
      })

      alert('タスクを登録しました')
    } catch (error) {
      console.error('タスク登録エラー:', error)
      alert('タスクの登録に失敗しました')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <Sparkles className="h-8 w-8 animate-pulse text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    )
  }

  // 統計情報の計算
  const now = new Date()
  const todayOverdueTasks = todayTasks.filter(task => 
    task.deadline && new Date(task.deadline) < now
  ).length
  const highPriorityTasks = todayTasks.filter(task => task.priority >= 8).length
  const inProgressProjects = projects.filter(p => p.status === 'in_progress').length
  const completedTodayTasks = todayTasks.filter(task => task.status === 'completed').length

  return (
    <div className="container mx-auto p-2 md:p-3 max-w-7xl">
      <div className="mb-4 md:mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="text-lg md:text-xl font-bold mb-1 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              ダッシュボード
            </h1>
            <p className="text-xs md:text-base text-muted-foreground">今日やるべきことを一目で確認</p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-xs md:text-sm text-muted-foreground">
              {new Date().toLocaleDateString('ja-JP', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid gap-2 md:gap-3 grid-cols-2 md:grid-cols-4 mb-3 md:mb-4">
        <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/tasks?filter=overdue'}>
          <CardContent className="p-2 md:p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-sm text-muted-foreground">期限切れ</p>
                <p className="text-lg md:text-xl font-bold">{todayOverdueTasks}</p>
              </div>
              <Clock className="h-8 md:h-10 w-8 md:w-10 text-red-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/tasks?filter=high-priority'}>
          <CardContent className="p-2 md:p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-sm text-muted-foreground">高優先度</p>
                <p className="text-lg md:text-xl font-bold">{highPriorityTasks}</p>
              </div>
              <TrendingUp className="h-8 md:h-10 w-8 md:w-10 text-orange-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/tasks?filter=today'}>
          <CardContent className="p-2 md:p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-sm text-muted-foreground">本日タスク</p>
                <p className="text-lg md:text-xl font-bold">{todayTasks.length}</p>
              </div>
              <Target className="h-8 md:h-10 w-8 md:w-10 text-blue-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/projects?filter=in-progress'}>
          <CardContent className="p-2 md:p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-sm text-muted-foreground">進行中</p>
                <p className="text-lg md:text-xl font-bold">{inProgressProjects}</p>
              </div>
              <FolderOpen className="h-8 md:h-10 w-8 md:w-10 text-green-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 担当者別サマリー */}
      {assigneeStats.length > 0 && (
        <Card className="mb-4 md:mb-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950 dark:to-teal-950 p-2 md:p-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                <Users className="h-4 md:h-5 w-4 md:w-5 text-green-600" />
                担当者別タスク状況
              </CardTitle>
              <Link href="/assignees/tasks">
                <ActionButton
                  icon={<ArrowRight className="h-4 w-4" />}
                  label="詳細"
                  size="sm"
                  tooltip="担当者別詳細を表示"
                  variant="outline"
                />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-2 md:pt-3 px-2 md:px-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {assigneeStats.map(stat => (
                <div
                  key={stat.assignee.id}
                  className="p-3 border rounded-lg hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
                  onClick={() => window.location.href = `/tasks?assignee=${stat.assignee.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-600" />
                      <span className="font-medium text-sm">{stat.assignee.name}</span>
                    </div>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {stat.taskCount}件
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-blue-600">
                      進行中: <strong>{stat.inProgressCount}</strong>
                    </span>
                    {stat.overdueCount > 0 && (
                      <span className="text-red-600">
                        期限切れ: <strong>{stat.overdueCount}</strong>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:gap-4 md:grid-cols-2">
        {/* 今日のタスク */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-2 md:p-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                <AlertCircle className="h-4 md:h-5 w-4 md:w-5 text-blue-600" />
                <span className="hidden md:inline">今日のタスク</span>
                <span className="md:hidden">タスク</span>
                <span className="text-xs md:text-sm font-normal text-muted-foreground">({todayTasks.length})</span>
              </CardTitle>
              <Link href="/tasks/new">
                <ActionButton
                  icon={<Plus className="h-4 w-4" />}
                  label="新規"
                  size="sm"
                  tooltip="タスクを追加"
                  variant="default"
                />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-2 md:pt-3 px-2 md:px-3">
            <div className="space-y-3">
              {todayTasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-muted-foreground">今日のタスクはありません</p>
                </div>
              ) : (
                todayTasks.slice(0, 5).map((task) => {
                  const isOverdue = task.deadline && new Date(task.deadline) < now
                  return (
                    <Link key={task.id} href={`/tasks/${task.id}`}>
                      <div className={`group p-2 md:p-3border rounded-lg md:rounded-xl hover:border-primary hover:bg-primary/5 cursor-pointer transition-all duration-200 ${
                        isOverdue ? 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20' : ''
                      }`}>
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm md:text-base group-hover:text-primary transition-colors line-clamp-1">
                            {task.title}
                          </h4>
                          <StatusBadge status={task.status} size="sm" />
                        </div>
                        <div className="flex items-center gap-2 md:gap-3">
                          <PriorityIndicator priority={task.priority} size="sm" showLabel={false} />
                          {task.deadline && (
                            <span className={`flex items-center gap-1 text-xs md:text-sm ${
                              isOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'
                            }`}>
                              <Calendar className="h-3 md:h-3.5 w-3 md:w-3.5" />
                              {new Date(task.deadline).toLocaleDateString('ja-JP')}
                            </span>
                          )}
                          <ArrowRight className="h-3 md:h-4 w-3 md:w-4 ml-auto text-gray-400 group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* プロジェクト一覧 */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 p-2 md:p-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                <FolderOpen className="h-4 md:h-5 w-4 md:w-5 text-purple-600" />
                <span className="hidden md:inline">アクティブプロジェクト</span>
                <span className="md:hidden">プロジェクト</span>
                <span className="text-xs md:text-sm font-normal text-muted-foreground">({projects.length})</span>
              </CardTitle>
              <Link href="/projects/new">
                <ActionButton
                  icon={<Plus className="h-4 w-4" />}
                  label="新規"
                  size="sm"
                  tooltip="プロジェクトを追加"
                  variant="default"
                />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-2 md:pt-3 px-2 md:px-3">
            <div className="space-y-3">
              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-muted-foreground">プロジェクトがありません</p>
                </div>
              ) : (
                projects.slice(0, 5).map((project) => (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <div className="group p-2 md:p-3border rounded-lg md:rounded-xl hover:border-primary hover:bg-primary/5 cursor-pointer transition-all duration-200">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-sm md:text-base group-hover:text-primary transition-colors line-clamp-1">
                          {project.name}
                        </h4>
                        <StatusBadge status={project.status} size="sm" />
                      </div>
                      <div className="flex items-center gap-2 md:gap-3">
                        <PriorityIndicator priority={project.priority} size="sm" showLabel={false} />
                        {project.deadline && (
                          <span className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground">
                            <Calendar className="h-3 md:h-3.5 w-3 md:w-3.5" />
                            {new Date(project.deadline).toLocaleDateString('ja-JP')}
                          </span>
                        )}
                        <ArrowRight className="h-3 md:h-4 w-3 md:w-4 ml-auto text-gray-400 group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 未登録タスク */}
      {unregisteredTasks.length > 0 && (
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 mt-4 md:mt-6">
          <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 p-2 md:p-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                <Inbox className="h-4 md:h-5 w-4 md:w-5 text-orange-600" />
                <span>未登録タスク</span>
                <span className="text-xs md:text-sm font-normal text-muted-foreground">({unregisteredTasks.length})</span>
              </CardTitle>
              <Link href="/unregistered-tasks">
                <ActionButton
                  icon={<ArrowRight className="h-4 w-4" />}
                  label="管理"
                  variant="outline"
                  size="sm"
                  tooltip="未登録タスクを管理"
                />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-2 md:pt-3 px-2 md:px-3">
            <div className="space-y-3">
              {unregisteredTasks.slice(0, 10).map((task) => (
                <div key={task.id} className="border border-orange-200 rounded-lg md:rounded-xl bg-orange-50/50 dark:bg-orange-950/20 overflow-hidden">
                  <div
                    className="group p-2 md:p-3cursor-pointer hover:bg-orange-100/50 transition-colors"
                    onClick={() => toggleTask(task.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {expandedTasks[task.id] ? (
                            <ChevronUp className="h-4 w-4 text-orange-600" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-orange-600" />
                          )}
                          <h4 className="font-semibold text-sm md:text-base">
                            {task.content.split('\n')[0]}
                          </h4>
                        </div>
                        {task.sender_name && (
                          <p className="text-xs md:text-sm text-muted-foreground ml-6">
                            送信者: {task.sender_name}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleTask(task.id)
                        }}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        {expandedTasks[task.id] ? '閉じる' : '登録'}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground ml-6 mt-2">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {task.line_group_name}
                      </span>
                      <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(task.created_at).toLocaleString('ja-JP', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                {/* 展開時のフォーム */}
                {expandedTasks[task.id] && taskForms[task.id] && (
                  <div className="p-3 border-t border-orange-200 bg-white dark:bg-gray-900">
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor={`title-${task.id}`} className="text-sm">タスク名 *</Label>
                        <Input
                          id={`title-${task.id}`}
                          value={taskForms[task.id].title}
                          onChange={(e) => updateTaskForm(task.id, 'title', e.target.value)}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`description-${task.id}`} className="text-sm">説明</Label>
                        <textarea
                          id={`description-${task.id}`}
                          className="w-full p-2 border rounded-md min-h-[80px] mt-1"
                          value={taskForms[task.id].description}
                          onChange={(e) => updateTaskForm(task.id, 'description', e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`project-${task.id}`} className="text-sm">プロジェクト *</Label>
                        <Select
                          value={taskForms[task.id].projectId}
                          onValueChange={(value) => updateTaskForm(task.id, 'projectId', value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="プロジェクトを選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`priority-${task.id}`} className="text-sm">優先度 (0-10)</Label>
                          <Input
                            id={`priority-${task.id}`}
                            type="number"
                            min="0"
                            max="10"
                            value={taskForms[task.id].priority}
                            onChange={(e) => updateTaskForm(task.id, 'priority', parseInt(e.target.value))}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor={`deadline-${task.id}`} className="text-sm">締切日</Label>
                          <Input
                            id={`deadline-${task.id}`}
                            type="date"
                            value={taskForms[task.id].deadline}
                            onChange={(e) => updateTaskForm(task.id, 'deadline', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor={`assignee-${task.id}`} className="text-sm">担当者</Label>
                        <Select
                          value={taskForms[task.id]?.assigneeId || ''}
                          onValueChange={(value) => updateTaskForm(task.id, 'assigneeId', value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="担当者を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">未割当</SelectItem>
                            {assignees && assignees.map((assignee) => (
                              <SelectItem key={assignee.id} value={assignee.id}>
                                {assignee.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          onClick={() => assignTask(task.id)}
                          disabled={!taskForms[task.id].projectId || !taskForms[task.id].title}
                          size="sm"
                        >
                          <CheckSquare className="h-4 w-4 mr-2" />
                          タスクとして登録
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 今日の進捗 */}
      {completedTodayTasks > 0 && (
        <div className="mt-4 md:mt-6 mb-4 md:mb-6">
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200">
            <CardContent className="p-2 md:p-3">
              <div className="flex items-center gap-2 md:gap-3">
                <CheckSquare className="h-5 md:h-6 w-5 md:w-6 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs md:text-sm text-muted-foreground">本日の完了</p>
                  <p className="text-xs md:text-sm font-bold text-green-700">{completedTodayTasks}/{todayTasks.length}件</p>
                </div>
                <div className="text-right">
                  <div className="text-base md:text-lg font-bold text-green-700">
                    {todayTasks.length > 0 ? Math.round((completedTodayTasks / todayTasks.length) * 100) : 0}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}