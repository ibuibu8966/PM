'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RecurringTask, Project } from '@/lib/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, RefreshCw, Edit2, Trash2, Play, Pause, Clock } from 'lucide-react'
import { PriorityIndicator } from '@/components/ui/priority-indicator'
import { useToast } from '@/contexts/toast-context'

const WEEKDAYS = [
  { value: 0, label: '日' },
  { value: 1, label: '月' },
  { value: 2, label: '火' },
  { value: 3, label: '水' },
  { value: 4, label: '木' },
  { value: 5, label: '金' },
  { value: 6, label: '土' },
]

export default function RecurringTasksPage() {
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<RecurringTask | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    priority: 5,
    recurrence_type: 'daily' as 'daily' | 'weekly' | 'monthly',
    recurrence_interval: 1,
    week_days: [] as number[],
    month_day: 1,
  })
  const supabase = createClient()
  const { showToast } = useToast()

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchData = async () => {
    try {
      // 繰り返しタスクを取得
      const { data: tasksData, error: tasksError } = await supabase
        .from('recurring_tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (tasksError) throw tasksError
      setRecurringTasks(tasksData || [])

      // プロジェクトを取得
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('name')

      if (projectsError) throw projectsError
      setProjects(projectsData || [])
    } catch (error) {
      console.error('データ取得エラー:', error)
      showToast('データの取得に失敗しました', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      showToast('タイトルを入力してください', 'error')
      return
    }

    try {
      const dataToSubmit = {
        title: formData.title,
        description: formData.description || null,
        project_id: formData.project_id || null,
        priority: formData.priority,
        recurrence_type: formData.recurrence_type,
        recurrence_interval: formData.recurrence_interval,
        week_days: formData.recurrence_type === 'weekly' ? formData.week_days : null,
        month_day: formData.recurrence_type === 'monthly' ? formData.month_day : null,
        is_active: true,
        next_generation_at: new Date().toISOString().split('T')[0],
      }

      if (editingTask) {
        const { error } = await supabase
          .from('recurring_tasks')
          .update(dataToSubmit)
          .eq('id', editingTask.id)

        if (error) throw error
        showToast('繰り返しタスクを更新しました', 'success')
      } else {
        const { error } = await supabase
          .from('recurring_tasks')
          .insert(dataToSubmit)
          .select()
          .single()

        if (error) throw error
        showToast('繰り返しタスクを作成しました', 'success')
      }

      resetForm()
      fetchData()
    } catch (error) {
      console.error('保存エラー:', error)
      showToast('保存に失敗しました', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この繰り返しタスクを削除してもよろしいですか？')) return

    try {
      const { error } = await supabase
        .from('recurring_tasks')
        .delete()
        .eq('id', id)

      if (error) throw error
      showToast('繰り返しタスクを削除しました', 'success')
      fetchData()
    } catch (error) {
      console.error('削除エラー:', error)
      showToast('削除に失敗しました', 'error')
    }
  }

  const handleToggleActive = async (task: RecurringTask) => {
    try {
      const { error } = await supabase
        .from('recurring_tasks')
        .update({ is_active: !task.is_active })
        .eq('id', task.id)

      if (error) throw error
      showToast(
        task.is_active ? '繰り返しタスクを無効にしました' : '繰り返しタスクを有効にしました',
        'success'
      )
      fetchData()
    } catch (error) {
      console.error('状態変更エラー:', error)
      showToast('状態の変更に失敗しました', 'error')
    }
  }

  const handleEdit = (task: RecurringTask) => {
    setEditingTask(task)
    setFormData({
      title: task.title,
      description: task.description || '',
      project_id: task.project_id || '',
      priority: task.priority,
      recurrence_type: task.recurrence_type,
      recurrence_interval: task.recurrence_interval,
      week_days: task.week_days || [],
      month_day: task.month_day || 1,
    })
    setIsAddDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      project_id: '',
      priority: 5,
      recurrence_type: 'daily',
      recurrence_interval: 1,
      week_days: [],
      month_day: 1,
    })
    setEditingTask(null)
    setIsAddDialogOpen(false)
  }

  const getRecurrenceText = (task: RecurringTask) => {
    switch (task.recurrence_type) {
      case 'daily':
        return task.recurrence_interval === 1 ? '毎日' : `${task.recurrence_interval}日ごと`
      case 'weekly':
        const days = task.week_days?.map(d => WEEKDAYS.find(w => w.value === d)?.label).join('・')
        return `毎週${days || ''}`
      case 'monthly':
        return `毎月${task.month_day}日`
      default:
        return ''
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-3 max-w-6xl">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold mb-2">繰り返しタスク管理</h1>
          <p className="text-muted-foreground">定期的に実行するタスクを管理します</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新規作成
        </Button>
      </div>

      {/* タスク一覧 */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {recurringTasks.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="text-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">繰り返しタスクがまだありません</p>
            </CardContent>
          </Card>
        ) : (
          recurringTasks.map((task) => (
            <Card key={task.id} className={!task.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{task.title}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(task)}
                      title={task.is_active ? '無効にする' : '有効にする'}
                    >
                      {task.is_active ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(task)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{getRecurrenceText(task)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityIndicator priority={task.priority} size="sm" />
                  </div>
                  {task.project_id && (
                    <div className="text-sm text-muted-foreground">
                      プロジェクト: {projects.find(p => p.id === task.project_id)?.name}
                    </div>
                  )}
                  {task.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {task.description}
                    </p>
                  )}
                  {!task.is_active && (
                    <span className="text-xs text-muted-foreground">無効</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 追加/編集ダイアログ */}
      {isAddDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {editingTask ? '繰り返しタスクを編集' : '繰り返しタスクを作成'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">タイトル</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="タスクのタイトル"
                />
              </div>

              <div>
                <Label htmlFor="description">説明</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="タスクの説明（任意）"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="project">プロジェクト</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="プロジェクトを選択（任意）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">なし</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">優先度</Label>
                <Input
                  id="priority"
                  type="number"
                  min="0"
                  max="10"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <Label htmlFor="recurrence_type">繰り返しタイプ</Label>
                <Select
                  value={formData.recurrence_type}
                  onValueChange={(value: 'daily' | 'weekly' | 'monthly') =>
                    setFormData({ ...formData, recurrence_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">毎日</SelectItem>
                    <SelectItem value="weekly">毎週</SelectItem>
                    <SelectItem value="monthly">毎月</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.recurrence_type === 'daily' && (
                <div>
                  <Label htmlFor="interval">間隔（日）</Label>
                  <Input
                    id="interval"
                    type="number"
                    min="1"
                    value={formData.recurrence_interval}
                    onChange={(e) =>
                      setFormData({ ...formData, recurrence_interval: parseInt(e.target.value) })
                    }
                  />
                </div>
              )}

              {formData.recurrence_type === 'weekly' && (
                <div>
                  <Label>曜日を選択</Label>
                  <div className="flex gap-2 mt-2">
                    {WEEKDAYS.map((day) => (
                      <div key={day.value} className="flex items-center">
                        <Checkbox
                          id={`day-${day.value}`}
                          checked={formData.week_days.includes(day.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                week_days: [...formData.week_days, day.value],
                              })
                            } else {
                              setFormData({
                                ...formData,
                                week_days: formData.week_days.filter((d) => d !== day.value),
                              })
                            }
                          }}
                        />
                        <Label
                          htmlFor={`day-${day.value}`}
                          className="ml-1 cursor-pointer"
                        >
                          {day.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formData.recurrence_type === 'monthly' && (
                <div>
                  <Label htmlFor="month_day">日付</Label>
                  <Input
                    id="month_day"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.month_day}
                    onChange={(e) =>
                      setFormData({ ...formData, month_day: parseInt(e.target.value) })
                    }
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleSubmit} className="flex-1">
                  {editingTask ? '更新' : '作成'}
                </Button>
                <Button variant="outline" onClick={resetForm} className="flex-1">
                  キャンセル
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}