'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Project, Customer, LineGroup } from '@/lib/types/database'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default function NewTaskPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [, setCustomers] = useState<Customer[]>([])
  const [, setLineGroups] = useState<LineGroup[]>([])
  const [assignees, setAssignees] = useState<{id: string, name: string}[]>([])
  
  const projectIdFromUrl = searchParams.get('project')
  const lineGroupIdFromUrl = searchParams.get('linegroup')
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectId: projectIdFromUrl || '',
    priority: 5,
    deadline: '',
    assigneeId: '',
    notificationTime: new Date().toISOString().slice(0, 16), // 初期値: 現在時刻（YYYY-MM-DDTHH:mm形式）
    isRecurring: false,
    recurrenceType: 'daily' as 'daily' | 'weekly' | 'monthly',
    recurrenceInterval: 1,
    weekDays: [] as number[],
    monthDay: 1
  })

  const WEEKDAYS = [
    { value: 0, label: '日' },
    { value: 1, label: '月' },
    { value: 2, label: '火' },
    { value: 3, label: '水' },
    { value: 4, label: '木' },
    { value: 5, label: '金' },
    { value: 6, label: '土' },
  ]

  useEffect(() => {
    fetchInitialData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineGroupIdFromUrl])

  const fetchInitialData = async () => {
    try {
      // プロジェクト一覧取得
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .order('name')
      setProjects(projectsData || [])

      // 顧客一覧取得
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .order('name')
      setCustomers(customersData || [])

      // LINEグループ一覧取得
      const { data: lineGroupsData } = await supabase
        .from('line_groups')
        .select('*')
        .order('name')
      setLineGroups(lineGroupsData || [])

      // 担当者一覧取得
      const { data: assigneesData } = await supabase
        .from('assignees')
        .select('*')
        .order('name')
      setAssignees(assigneesData || [])

      // LINEグループIDから関連プロジェクトを取得
      if (lineGroupIdFromUrl) {
        const { data: lineGroupProjects } = await supabase
          .from('project_line_groups')
          .select('project_id')
          .eq('line_group_id', lineGroupIdFromUrl)
        
        if (lineGroupProjects && lineGroupProjects.length > 0) {
          // 最初のプロジェクトを選択
          setFormData(prev => ({ ...prev, projectId: lineGroupProjects[0].project_id }))
        }
      }
    } catch (error) {
      console.error('データ取得エラー:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (formData.isRecurring) {
        // 繰り返しタスクとして作成
        const recurringData = {
          title: formData.title,
          description: formData.description || null,
          project_id: formData.projectId || null,
          priority: formData.priority,
          recurrence_type: formData.recurrenceType,
          recurrence_interval: formData.recurrenceInterval,
          week_days: formData.recurrenceType === 'weekly' ? formData.weekDays : null,
          month_day: formData.recurrenceType === 'monthly' ? formData.monthDay : null,
          is_active: true,
          next_generation_at: new Date().toISOString().split('T')[0],
        }

        const { error: recurringError } = await supabase
          .from('recurring_tasks')
          .insert(recurringData)

        if (recurringError) throw recurringError

        // 初回のタスクも作成
        const taskData: Record<string, unknown> = {
          title: formData.title,
          description: formData.description,
          project_id: formData.projectId,
          priority: formData.priority,
          status: 'not_started',
          deadline: formData.deadline || new Date().toISOString(),
          notification_time: formData.notificationTime
        }

        if (formData.assigneeId && formData.assigneeId !== 'none') {
          taskData.assignee_id = formData.assigneeId
        }

        const { error: taskError } = await supabase
          .from('tasks')
          .insert(taskData)

        if (taskError) throw taskError
      } else {
        // 通常のタスクとして作成
        const taskData: Record<string, unknown> = {
          title: formData.title,
          description: formData.description,
          project_id: formData.projectId,
          priority: formData.priority,
          status: 'not_started',
          deadline: formData.deadline || null,
          notification_time: formData.notificationTime
        }

        if (formData.assigneeId && formData.assigneeId !== 'none') {
          taskData.assignee_id = formData.assigneeId
        }

        const { error: taskError } = await supabase
          .from('tasks')
          .insert(taskData)

        if (taskError) throw taskError
      }

      router.push('/tasks')
    } catch (error) {
      console.error('タスク作成エラー:', error)
      console.error('エラー詳細:', (error as Error)?.message || error)
      alert(`タスクの作成に失敗しました: ${(error as Error)?.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <Link href="/tasks">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">新規タスク作成</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">タスク名 *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">説明</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="project">プロジェクト *</Label>
              <select
                id="project"
                className="w-full px-3 py-2 border rounded-md"
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                required
              >
                <option value="">選択してください</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="assignee">担当者</Label>
              <Select
                value={formData.assigneeId}
                onValueChange={(value) => setFormData({ ...formData, assigneeId: value })}
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">優先度 (0-10)</Label>
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
                <Label htmlFor="deadline">締切日</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notificationTime">通知日時 *</Label>
              <Input
                id="notificationTime"
                type="datetime-local"
                value={formData.notificationTime}
                onChange={(e) => setFormData({ ...formData, notificationTime: e.target.value })}
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                この日時になると通知一覧に表示されます
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 繰り返し設定 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              繰り返し設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRecurring"
                checked={formData.isRecurring}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isRecurring: checked as boolean })
                }
              />
              <Label htmlFor="isRecurring" className="cursor-pointer">
                繰り返しタスクとして設定
              </Label>
            </div>

            {formData.isRecurring && (
              <>
                <div>
                  <Label htmlFor="recurrenceType">繰り返しタイプ</Label>
                  <Select
                    value={formData.recurrenceType}
                    onValueChange={(value: 'daily' | 'weekly' | 'monthly') =>
                      setFormData({ ...formData, recurrenceType: value })
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

                {formData.recurrenceType === 'daily' && (
                  <div>
                    <Label htmlFor="interval">間隔（日）</Label>
                    <Input
                      id="interval"
                      type="number"
                      min="1"
                      value={formData.recurrenceInterval}
                      onChange={(e) =>
                        setFormData({ ...formData, recurrenceInterval: parseInt(e.target.value) })
                      }
                    />
                  </div>
                )}

                {formData.recurrenceType === 'weekly' && (
                  <div>
                    <Label>曜日を選択</Label>
                    <div className="flex gap-2 mt-2">
                      {WEEKDAYS.map((day) => (
                        <div key={day.value} className="flex items-center">
                          <Checkbox
                            id={`day-${day.value}`}
                            checked={formData.weekDays.includes(day.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  weekDays: [...formData.weekDays, day.value],
                                })
                              } else {
                                setFormData({
                                  ...formData,
                                  weekDays: formData.weekDays.filter((d) => d !== day.value),
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

                {formData.recurrenceType === 'monthly' && (
                  <div>
                    <Label htmlFor="monthDay">日付</Label>
                    <Input
                      id="monthDay"
                      type="number"
                      min="1"
                      max="31"
                      value={formData.monthDay}
                      onChange={(e) =>
                        setFormData({ ...formData, monthDay: parseInt(e.target.value) })
                      }
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? '作成中...' : 'タスクを作成'}
          </Button>
          <Link href="/tasks" className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              キャンセル
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}