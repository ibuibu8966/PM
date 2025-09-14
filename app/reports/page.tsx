'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Project, Task } from '@/lib/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GanttChart } from '@/components/ui/gantt-chart'
import {
  BarChart,
  PieChart,
  TrendingUp,
  Users,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

type Assignee = {
  id: string
  name: string
}

export default function ReportsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [assignees, setAssignees] = useState<Assignee[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchData = async () => {
    try {
      const [projectsResult, tasksResult, assigneesResult] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('tasks').select('*'),
        supabase.from('assignees').select('*')
      ])

      setProjects(projectsResult.data || [])
      setTasks(tasksResult.data || [])
      setAssignees(assigneesResult.data || [])
    } catch (error) {
      console.error('データ取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-screen">読み込み中...</div>
  }

  // 統計データの計算
  const completedProjects = projects.filter(p => p.status === 'completed').length
  const inProgressProjects = projects.filter(p => p.status === 'in_progress').length
  const completedTasks = tasks.filter(t => t.status === 'completed').length

  const now = new Date()
  const overdueTasks = tasks.filter(t =>
    t.deadline && new Date(t.deadline) < now && t.status !== 'completed'
  ).length

  // ステータス別タスク数
  const tasksByStatus = {
    not_started: tasks.filter(t => t.status === 'not_started').length,
    waiting_confirmation: tasks.filter(t => t.status === 'waiting_confirmation').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length
  }

  // 優先度別タスク数
  const tasksByPriority = {
    high: tasks.filter(t => t.priority >= 8).length,
    medium: tasks.filter(t => t.priority >= 5 && t.priority < 8).length,
    low: tasks.filter(t => t.priority < 5).length
  }

  // 担当者別タスク数
  const tasksByAssignee = assignees.map(assignee => ({
    name: assignee.name,
    total: tasks.filter(t => t.assignee_id === assignee.id).length,
    completed: tasks.filter(t => t.assignee_id === assignee.id && t.status === 'completed').length,
    inProgress: tasks.filter(t => t.assignee_id === assignee.id && t.status === 'in_progress').length
  })).filter(a => a.total > 0)

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">レポート・分析</h1>
        <p className="text-muted-foreground">プロジェクトとタスクの詳細な分析</p>
      </div>

      {/* サマリーカード */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">完了プロジェクト</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedProjects}</div>
            <p className="text-xs text-muted-foreground">
              全{projects.length}件中
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">進行中プロジェクト</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressProjects}</div>
            <p className="text-xs text-muted-foreground">
              アクティブ
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">完了タスク</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasks}</div>
            <p className="text-xs text-muted-foreground">
              全{tasks.length}件中
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">期限切れタスク</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueTasks}</div>
            <p className="text-xs text-muted-foreground">
              要対応
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ステータス別分析 */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              ステータス別タスク分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-500" />
                  未着手
                </span>
                <span className="font-bold">{tasksByStatus.not_started}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  確認待ち
                </span>
                <span className="font-bold">{tasksByStatus.waiting_confirmation}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  進行中
                </span>
                <span className="font-bold">{tasksByStatus.in_progress}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  完了
                </span>
                <span className="font-bold">{tasksByStatus.completed}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              優先度別タスク分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">高優先度 (8-10)</span>
                  <span className="font-bold">{tasksByPriority.high}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{ width: `${(tasksByPriority.high / tasks.length) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">中優先度 (5-7)</span>
                  <span className="font-bold">{tasksByPriority.medium}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{ width: `${(tasksByPriority.medium / tasks.length) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">低優先度 (0-4)</span>
                  <span className="font-bold">{tasksByPriority.low}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gray-500 h-2 rounded-full"
                    style={{ width: `${(tasksByPriority.low / tasks.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 担当者別分析 */}
      {tasksByAssignee.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              担当者別タスク状況
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasksByAssignee.map((assignee) => (
                <div key={assignee.name} className="border-b pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{assignee.name}</span>
                    <span className="text-sm text-muted-foreground">
                      合計: {assignee.total}件
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">完了:</span>
                      <span className="font-medium text-emerald-600">{assignee.completed}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">進行中:</span>
                      <span className="font-medium text-blue-600">{assignee.inProgress}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">その他:</span>
                      <span className="font-medium">
                        {assignee.total - assignee.completed - assignee.inProgress}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2 flex overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2"
                      style={{ width: `${(assignee.completed / assignee.total) * 100}%` }}
                    />
                    <div
                      className="bg-blue-500 h-2"
                      style={{ width: `${(assignee.inProgress / assignee.total) * 100}%` }}
                    />
                    <div
                      className="bg-gray-400 h-2"
                      style={{
                        width: `${((assignee.total - assignee.completed - assignee.inProgress) / assignee.total) * 100}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ガントチャート */}
      <GanttChart projects={projects} tasks={tasks} />
    </div>
  )
}