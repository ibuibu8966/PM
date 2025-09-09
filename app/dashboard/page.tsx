'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Project, Task, UnregisteredTask, LineGroup } from '@/lib/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { PriorityIndicator } from '@/components/ui/priority-indicator'
import { ActionButton } from '@/components/ui/action-button'
import { Plus, Calendar, AlertCircle, FolderOpen, CheckSquare, Users, MessageSquare, ArrowRight, Sparkles, Clock, TrendingUp, Target, Inbox } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [todayTasks, setTodayTasks] = useState<Task[]>([])
  const [unregisteredTasks, setUnregisteredTasks] = useState<UnregisteredTask[]>([])
  const [lineGroups, setLineGroups] = useState<{ [key: string]: LineGroup }>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // プロジェクト、タスク、未登録タスクを並列で取得
      const [projectsResult, tasksResult, unregisteredResult] = await Promise.all([
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
          .from('unregistered_tasks')
          .select('*')
          .eq('processed', false)
          .order('received_at', { ascending: false })
      ])

      if (projectsResult.error) throw projectsResult.error
      if (tasksResult.error) throw tasksResult.error
      if (unregisteredResult.error) throw unregisteredResult.error
      
      setProjects(projectsResult.data || [])
      setTodayTasks(tasksResult.data || [])
      setUnregisteredTasks(unregisteredResult.data || [])
      
      // 未登録タスクに関連するLINEグループ情報を取得
      if (unregisteredResult.data && unregisteredResult.data.length > 0) {
        const lineGroupIds = [...new Set(unregisteredResult.data.map((t: UnregisteredTask) => t.line_group_id))]
        const { data: lineGroupsData } = await supabase
          .from('line_groups')
          .select('*')
          .in('id', lineGroupIds)
        
        if (lineGroupsData) {
          const groupsMap: { [key: string]: LineGroup } = {}
          lineGroupsData.forEach((g: LineGroup) => {
            groupsMap[g.id] = g
          })
          setLineGroups(groupsMap)
        }
      }
    } catch (error) {
      console.error('データ取得エラー:', error)
    } finally {
      setLoading(false)
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
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="mb-4 md:mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
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
      <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4 mb-4 md:mb-6">
        <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/tasks'}>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-sm text-muted-foreground">期限切れ</p>
                <p className="text-2xl md:text-3xl font-bold">{todayOverdueTasks}</p>
              </div>
              <Clock className="h-8 md:h-10 w-8 md:w-10 text-red-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/tasks'}>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-sm text-muted-foreground">高優先度</p>
                <p className="text-2xl md:text-3xl font-bold">{highPriorityTasks}</p>
              </div>
              <TrendingUp className="h-8 md:h-10 w-8 md:w-10 text-orange-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/tasks'}>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-sm text-muted-foreground">本日タスク</p>
                <p className="text-2xl md:text-3xl font-bold">{todayTasks.length}</p>
              </div>
              <Target className="h-8 md:h-10 w-8 md:w-10 text-blue-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/projects'}>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-sm text-muted-foreground">進行中</p>
                <p className="text-2xl md:text-3xl font-bold">{inProgressProjects}</p>
              </div>
              <FolderOpen className="h-8 md:h-10 w-8 md:w-10 text-green-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:gap-6 md:grid-cols-2">
        {/* 今日のタスク */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-4 md:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
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
          <CardContent className="pt-4 md:pt-6 px-4 md:px-6">
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
                      <div className={`group p-3 md:p-4 border rounded-lg md:rounded-xl hover:border-primary hover:bg-primary/5 cursor-pointer transition-all duration-200 ${
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
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 p-4 md:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
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
          <CardContent className="pt-4 md:pt-6 px-4 md:px-6">
            <div className="space-y-3">
              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-muted-foreground">プロジェクトがありません</p>
                </div>
              ) : (
                projects.slice(0, 5).map((project) => (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <div className="group p-3 md:p-4 border rounded-lg md:rounded-xl hover:border-primary hover:bg-primary/5 cursor-pointer transition-all duration-200">
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
          <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 p-4 md:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Inbox className="h-4 md:h-5 w-4 md:w-5 text-orange-600" />
                <span>未登録タスク</span>
                <span className="text-xs md:text-sm font-normal text-muted-foreground">({unregisteredTasks.length})</span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4 md:pt-6 px-4 md:px-6">
            <div className="space-y-3">
              {unregisteredTasks.slice(0, 10).map((task) => (
                <div key={task.id} className="group p-3 md:p-4 border border-orange-200 rounded-lg md:rounded-xl bg-orange-50/50 dark:bg-orange-950/20">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm md:text-base mb-1">
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <Link href={`/tasks/new?unregistered=${task.id}`}>
                      <ActionButton
                        icon={<Plus className="h-3 w-3" />}
                        label="登録"
                        size="sm"
                        tooltip="タスクとして登録"
                        variant="outline"
                      />
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {lineGroups[task.line_group_id] && (
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {lineGroups[task.line_group_id].name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(task.received_at).toLocaleString('ja-JP', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
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
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <CheckSquare className="h-5 md:h-6 w-5 md:w-6 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs md:text-sm text-muted-foreground">本日の完了</p>
                  <p className="text-sm md:text-xl font-bold text-green-700">{completedTodayTasks}/{todayTasks.length}件</p>
                </div>
                <div className="text-right">
                  <div className="text-xl md:text-2xl font-bold text-green-700">
                    {todayTasks.length > 0 ? Math.round((completedTodayTasks / todayTasks.length) * 100) : 0}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* クイックアクション */}
      <div className="mt-6 md:mt-8">
        <h2 className="text-sm md:text-lg font-semibold mb-3 md:mb-4 text-muted-foreground">クイックアクセス</h2>
        <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 md:gap-3">
          <Link href="/tasks">
            <ActionButton
              icon={<CheckSquare className="h-4 w-4" />}
              label="すべてのタスク"
              variant="outline"
              tooltip="タスク一覧を表示"
            />
          </Link>
          <Link href="/projects">
            <ActionButton
              icon={<FolderOpen className="h-4 w-4" />}
              label="すべてのプロジェクト"
              variant="outline"
              tooltip="プロジェクト一覧を表示"
            />
          </Link>
          <Link href="/customers">
            <ActionButton
              icon={<Users className="h-4 w-4" />}
              label="顧客管理"
              variant="outline"
              tooltip="顧客一覧を表示"
            />
          </Link>
          <Link href="/line-groups">
            <ActionButton
              icon={<MessageSquare className="h-4 w-4" />}
              label="LINEグループ"
              variant="outline"
              tooltip="LINEグループ一覧を表示"
            />
          </Link>
        </div>
      </div>
    </div>
  )
}