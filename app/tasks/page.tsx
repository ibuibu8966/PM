'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Task, Project } from '@/lib/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge, StatusType } from '@/components/ui/status-badge'
import { InlineStatusSelect } from '@/components/ui/inline-status-select'
import { InlinePrioritySelect } from '@/components/ui/inline-priority-select'
import { ActionButton } from '@/components/ui/action-button'
import { Plus, Search, Calendar, Filter, CheckSquare, FolderOpen, ArrowRight, Edit, ArrowUp, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

type Assignee = {
  id: string
  name: string
}

type TaskWithAssignee = Task & {
  assignee?: Assignee
}

export default function TasksPage() {
  const searchParams = useSearchParams()
  const [tasks, setTasks] = useState<TaskWithAssignee[]>([])
  const [projects, setProjects] = useState<{ [key: string]: Project }>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'priority' | 'deadline'>('priority')
  const [showFilters, setShowFilters] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // URLパラメータからフィルタを設定
    const filter = searchParams.get('filter')
    const assigneeId = searchParams.get('assignee')

    if (filter === 'overdue') {
      setStatusFilter('overdue')
      setSortBy('deadline')
    } else if (filter === 'high-priority') {
      setSortBy('priority')
      setStatusFilter('active')
    } else if (filter === 'today') {
      setStatusFilter('today')
      setSortBy('priority')
    }

    if (assigneeId) {
      setAssigneeFilter(assigneeId)
    }

    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const updateTaskStatus = async (taskId: string, newStatus: StatusType) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId)

    if (error) {
      console.error('ステータス更新エラー:', error)
      throw error
    }

    // ローカルステートを更新
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: newStatus } : t
    ))
  }

  const updateTaskPriority = async (taskId: string, newPriority: number) => {
    const { error } = await supabase
      .from('tasks')
      .update({ priority: newPriority })
      .eq('id', taskId)

    if (error) {
      console.error('優先度更新エラー:', error)
      throw error
    }

    // ローカルステートを更新
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, priority: newPriority } : t
    ))
  }

  const fetchData = async () => {
    try {
      // 担当者取得（エラーがあっても続行）
      const { data: assigneesData, error: assigneesError } = await supabase
        .from('assignees')
        .select('*')
        .order('name')

      let assigneesList: Assignee[] = []
      if (!assigneesError && assigneesData) {
        assigneesList = assigneesData
      } else {
        console.log('担当者テーブルが存在しない可能性があります:', assigneesError)
      }

      // タスク取得（担当者情報は別途取得）
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('priority', { ascending: false })
        .order('deadline', { ascending: true })

      if (tasksError) throw tasksError

      // 担当者情報をタスクに追加（担当者データがある場合）
      const tasksWithAssignees = tasksData?.map((task: Task) => {
        const assignee = assigneesList?.find((a: Assignee) => a.id === task.assignee_id)
        return { ...task, assignee }
      }) || []

      setTasks(tasksWithAssignees)

      // プロジェクト情報取得
      if (tasksData && tasksData.length > 0) {
        const projectIds = [...new Set(tasksData.map((t: Task) => t.project_id))]
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .in('id', projectIds)

        if (projectsError) throw projectsError
        
        const projectsMap: { [key: string]: Project } = {}
        projectsData?.forEach((p: Project) => {
          projectsMap[p.id] = p
        })
        setProjects(projectsMap)
      }
    } catch (error) {
      console.error('データ取得エラー:', error)
      console.error('エラー詳細:', (error as Error)?.message || error)
    } finally {
      setLoading(false)
    }
  }


  const filteredTasks = tasks
    .filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.description?.toLowerCase().includes(searchTerm.toLowerCase())

      // ステータスフィルタ
      let matchesStatus = true
      const now = new Date()
      if (statusFilter === 'overdue') {
        matchesStatus = task.deadline ? new Date(task.deadline) < now && task.status !== 'completed' : false
      } else if (statusFilter === 'active') {
        matchesStatus = task.status !== 'completed'
      } else if (statusFilter === 'today') {
        const today = new Date().toISOString().split('T')[0]
        matchesStatus = task.deadline ? task.deadline.split('T')[0] <= today && task.status !== 'completed' : false
      } else if (statusFilter !== 'all') {
        matchesStatus = task.status === statusFilter
      }

      // 担当者フィルタ
      const matchesAssignee = assigneeFilter === 'all' || task.assignee_id === assigneeFilter

      // 高優先度フィルタ（URLパラメータから）
      const filterParam = searchParams.get('filter')
      const matchesPriority = filterParam === 'high-priority' ? task.priority >= 8 : true

      return matchesSearch && matchesStatus && matchesAssignee && matchesPriority
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        return b.priority - a.priority
      } else {
        // deadline順（nullは最後に）
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      }
    })

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <CheckSquare className="h-8 w-8 animate-pulse text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="mb-4 md:mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            タスク一覧
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">すべてのタスクを管理</p>
        </div>
        <Link href="/tasks/new">
          <ActionButton
            icon={<Plus className="h-4 w-4" />}
            label="新規タスク"
            tooltip="タスクを追加"
            variant="default"
          />
        </Link>
      </div>

      {/* フィルター - モバイル向け統合トグル */}
      <div className="mb-4 md:hidden relative">
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="outline"
          size="sm"
          className="w-full justify-between h-10"
        >
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            検索・フィルター・並び替え
            {(searchTerm || statusFilter !== 'all') && <span className="text-primary">(適用中)</span>}
          </span>
          {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        
        {showFilters && (
          <div className="absolute top-full left-0 right-0 z-40 mt-2 space-y-3 p-3 bg-background border rounded-lg shadow-lg">
            {/* 1段目 - 検索 */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">検索</label>
              <Input
                placeholder="タスクを検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* 2段目 - ステータスフィルター */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">ステータス</label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => setStatusFilter('all')}
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs px-2"
                >
                  すべて
                </Button>
                <Button
                  onClick={() => setStatusFilter('not_started')}
                  variant={statusFilter === 'not_started' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs px-2"
                >
                  未着手
                </Button>
                <Button
                  onClick={() => setStatusFilter('waiting_confirmation')}
                  variant={statusFilter === 'waiting_confirmation' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs px-2"
                >
                  確認待ち
                </Button>
                <Button
                  onClick={() => setStatusFilter('in_progress')}
                  variant={statusFilter === 'in_progress' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs px-2"
                >
                  進行中
                </Button>
              </div>
            </div>

            {/* 3段目 - 並び替え */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">並び替え</label>
              <div className="flex gap-2">
                <Button
                  onClick={() => setSortBy('priority')}
                  variant={sortBy === 'priority' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs gap-1 px-2"
                >
                  <ArrowUp className="h-3 w-3" />
                  優先度順
                </Button>
                <Button
                  onClick={() => setSortBy('deadline')}
                  variant={sortBy === 'deadline' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs gap-1 px-2"
                >
                  <Calendar className="h-3 w-3" />
                  期限順
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* デスクトップ用フィルター */}
      <div className="hidden md:block mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="タスクを検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setStatusFilter('all')}
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
          >
            すべて
          </Button>
          <Button
            onClick={() => setStatusFilter('not_started')}
            variant={statusFilter === 'not_started' ? 'default' : 'outline'}
            size="sm"
          >
            未着手
          </Button>
          <Button
            onClick={() => setStatusFilter('waiting_confirmation')}
            variant={statusFilter === 'waiting_confirmation' ? 'default' : 'outline'}
            size="sm"
          >
            確認待ち
          </Button>
          <Button
            onClick={() => setStatusFilter('in_progress')}
            variant={statusFilter === 'in_progress' ? 'default' : 'outline'}
            size="sm"
          >
            進行中
          </Button>
          <div className="w-px bg-border mx-2" />
          <Button
            onClick={() => setSortBy('priority')}
            variant={sortBy === 'priority' ? 'default' : 'outline'}
            size="sm"
            className="gap-1"
          >
            <ArrowUp className="h-4 w-4" />
            優先度順
          </Button>
          <Button
            onClick={() => setSortBy('deadline')}
            variant={sortBy === 'deadline' ? 'default' : 'outline'}
            size="sm"
            className="gap-1"
          >
            <Calendar className="h-4 w-4" />
            期限順
          </Button>
        </div>
      </div>

      {/* タスクリスト */}
      <div className="grid gap-4">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">タスクが見つかりません</p>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => (
            <Card key={task.id} className="hover:shadow-lg transition-all duration-300 border hover:border-primary/30">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link href={`/tasks/${task.id}`}>
                      <h3 className="text-lg md:text-xl font-bold hover:text-primary cursor-pointer transition-colors flex items-center gap-2">
                        <CheckSquare className="h-4 md:h-5 w-4 md:w-5 text-blue-600 flex-shrink-0" />
                        <span className="line-clamp-2">{task.title}</span>
                      </h3>
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-3 md:mt-4 pl-6 md:pl-7">
                      <InlinePrioritySelect 
                        value={task.priority} 
                        onChange={(priority) => updateTaskPriority(task.id, priority)}
                      />
                      {task.deadline && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(task.deadline).toLocaleDateString('ja-JP')}
                        </span>
                      )}
                      {projects[task.project_id] && (
                        <Link href={`/projects/${task.project_id}`}>
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md text-xs font-medium transition-colors cursor-pointer">
                            <FolderOpen className="h-3 w-3" />
                            {projects[task.project_id].name}
                          </span>
                        </Link>
                      )}
                      {task.assignee && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-md text-xs font-medium">
                          {task.assignee.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="hidden md:block">
                      <InlineStatusSelect 
                        value={task.status as StatusType} 
                        onChange={(status) => updateTaskStatus(task.id, status)}
                      />
                    </div>
                    <div className="md:hidden">
                      <StatusBadge status={task.status} size="sm" />
                    </div>
                    <div className="hidden md:flex gap-2">
                      <Link href={`/tasks/${task.id}`}>
                        <ActionButton
                          icon={<ArrowRight className="h-4 w-4" />}
                          label="詳細"
                          variant="ghost"
                          size="sm"
                          tooltip="タスク詳細を表示"
                        />
                      </Link>
                      <Link href={`/tasks/${task.id}/edit`}>
                        <ActionButton
                          icon={<Edit className="h-4 w-4" />}
                          label="編集"
                          variant="outline"
                          size="sm"
                          tooltip="タスクを編集"
                        />
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}