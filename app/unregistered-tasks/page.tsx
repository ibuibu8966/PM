'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UnregisteredTask, Project } from '@/lib/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { ActionButton } from '@/components/ui/action-button'
import { Inbox, CheckCircle, Trash2, Calendar, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

type ExpandedTask = {
  [key: string]: boolean
}

export default function UnregisteredTasksPage() {
  const [unregisteredTasks, setUnregisteredTasks] = useState<UnregisteredTask[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [assignees, setAssignees] = useState<{id: string, name: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTasks, setExpandedTasks] = useState<ExpandedTask>({})
  const supabase = createClient()

  // 各タスクのフォームデータ
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

  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchData = async () => {
    try {
      // 未登録タスク取得
      const { data: tasksData } = await supabase
        .from('unregistered_tasks')
        .select('*')
        .order('created_at', { ascending: false })

      setUnregisteredTasks(tasksData || [])

      // プロジェクト一覧取得（全件取得）
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .order('name')

      setProjects(projectsData || [])

      // 担当者一覧取得（エラーの場合は空配列）
      try {
        const { data: assigneesData } = await supabase
          .from('assignees')
          .select('*')
          .order('name')

        setAssignees(assigneesData || [])
      } catch (assigneeError) {
        console.log('担当者データ取得エラー（テーブルが存在しない可能性があります）:', assigneeError)
        setAssignees([])
      }

      // 初期フォームデータ設定
      const initialForms: typeof taskForms = {}
      tasksData?.forEach((task: UnregisteredTask) => {
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
    } catch (error) {
      console.error('データ取得エラー:', error)
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

      // データを再取得して一覧を更新
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

  const deleteTask = async (taskId: string) => {
    if (!confirm('このタスクを削除してもよろしいですか？')) return

    try {
      const { error } = await supabase
        .from('unregistered_tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error

      // データを再取得して一覧を更新
      await fetchData()

      // 展開状態をリセット
      setExpandedTasks(prev => {
        const newExpanded = { ...prev }
        delete newExpanded[taskId]
        return newExpanded
      })
    } catch (error) {
      console.error('削除エラー:', error)
      alert('削除に失敗しました')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <Inbox className="h-8 w-8 animate-pulse text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl">
      <div className="mb-6">
        <Link href="/dashboard">
          <ActionButton
            icon={<ArrowLeft className="h-4 w-4" />}
            label="ダッシュボードへ"
            variant="ghost"
            size="sm"
          />
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Inbox className="h-8 w-8 text-orange-600" />
          未登録タスク管理
        </h1>
        <p className="text-muted-foreground">
          LINEから受信したタスクをプロジェクトに割り当てます
        </p>
      </div>

      {unregisteredTasks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Inbox className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">未登録タスクはありません</p>
            <p className="text-sm text-muted-foreground mt-2">
              LINEでタスクを送信すると、ここに表示されます
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {unregisteredTasks.map((task) => (
            <Card key={task.id} className="overflow-hidden">
              <CardHeader
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => toggleTask(task.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {expandedTasks[task.id] ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                      {task.content.split('\n')[0]}
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>グループ: {task.line_group_name}</span>
                      {task.sender_name && <span>送信者: {task.sender_name}</span>}
                      <span>
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {new Date(task.created_at).toLocaleString('ja-JP')}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteTask(task.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              {expandedTasks[task.id] && taskForms[task.id] && (
                <CardContent className="border-t pt-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`title-${task.id}`}>タスク名 *</Label>
                      <Input
                        id={`title-${task.id}`}
                        value={taskForms[task.id].title}
                        onChange={(e) => updateTaskForm(task.id, 'title', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`description-${task.id}`}>説明</Label>
                      <textarea
                        id={`description-${task.id}`}
                        className="w-full p-2 border rounded-md min-h-[100px]"
                        value={taskForms[task.id].description}
                        onChange={(e) => updateTaskForm(task.id, 'description', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`project-${task.id}`}>プロジェクト *</Label>
                      <SearchableSelect
                        options={projects.map(p => ({ id: p.id, name: p.name }))}
                        value={taskForms[task.id].projectId}
                        onChange={(value) => updateTaskForm(task.id, 'projectId', value)}
                        placeholder="プロジェクトを選択"
                        searchPlaceholder="プロジェクト名で検索..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`priority-${task.id}`}>優先度 (0-10)</Label>
                        <Input
                          id={`priority-${task.id}`}
                          type="number"
                          min="0"
                          max="10"
                          value={taskForms[task.id].priority}
                          onChange={(e) => updateTaskForm(task.id, 'priority', parseInt(e.target.value))}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`deadline-${task.id}`}>締切日</Label>
                        <Input
                          id={`deadline-${task.id}`}
                          type="date"
                          value={taskForms[task.id].deadline}
                          onChange={(e) => updateTaskForm(task.id, 'deadline', e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor={`assignee-${task.id}`}>担当者</Label>
                      <Select
                        value={taskForms[task.id].assigneeId}
                        onValueChange={(value) => updateTaskForm(task.id, 'assigneeId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="担当者を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">未割当</SelectItem>
                          {assignees.map((assignee) => (
                            <SelectItem key={assignee.id} value={assignee.id}>
                              {assignee.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        onClick={() => assignTask(task.id)}
                        disabled={!taskForms[task.id].projectId || !taskForms[task.id].title}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        タスクとして登録
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}