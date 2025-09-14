'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Task, Project } from '@/lib/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { ActionButton } from '@/components/ui/action-button'
import { ArrowLeft, Save, X, CheckSquare } from 'lucide-react'
import Link from 'next/link'

export default function EditTaskPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id as string
  const supabase = createClient()
  
  const [task, setTask] = useState<Task | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [assignees, setAssignees] = useState<{id: string, name: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    status: 'not_started',
    priority: 5,
    deadline: '',
    assignee_id: ''
  })

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId])

  const fetchData = async () => {
    try {
      // タスク情報取得
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (taskError) throw taskError
      
      setTask(taskData)
      setFormData({
        title: taskData.title,
        description: taskData.description || '',
        project_id: taskData.project_id,
        status: taskData.status,
        priority: taskData.priority,
        deadline: taskData.deadline ? taskData.deadline.split('T')[0] : '',
        assignee_id: taskData.assignee_id || ''
      })

      // プロジェクト一覧取得
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('name')

      if (projectsError) throw projectsError
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

    } catch (error) {
      console.error('データ取得エラー:', error)
      alert('データの取得に失敗しました')
      router.push('/tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.project_id) {
      alert('タスク名とプロジェクトは必須です')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          project_id: formData.project_id,
          status: formData.status,
          priority: formData.priority,
          deadline: formData.deadline || null,
          assignee_id: formData.assignee_id || null
        })
        .eq('id', taskId)

      if (error) throw error
      
      router.push(`/tasks/${taskId}`)
    } catch (error) {
      console.error('更新エラー:', error)
      alert('タスクの更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

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

  if (!task) {
    return (
      <div className="container mx-auto p-6">
        <p>タスクが見つかりません</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="mb-6">
        <Link href={`/tasks/${taskId}`}>
          <ActionButton
            icon={<ArrowLeft className="h-4 w-4" />}
            label="戻る"
            variant="ghost"
            size="sm"
          />
        </Link>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <CheckSquare className="h-6 w-6 text-blue-600" />
            タスクを編集
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title">タスク名 *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="タスク名を入力"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="タスクの詳細を入力"
                className="min-h-[100px]"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="project">プロジェクト *</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                >
                  <SelectTrigger id="project">
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

              <div>
                <Label htmlFor="status">ステータス</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">未着手</SelectItem>
                    <SelectItem value="waiting_confirmation">確認待ち</SelectItem>
                    <SelectItem value="in_progress">進行中</SelectItem>
                    <SelectItem value="completed">完了</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="priority">優先度 (0-10)</Label>
                <Input
                  id="priority"
                  type="number"
                  min="0"
                  max="10"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label htmlFor="deadline">期限</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="assignee">担当者</Label>
              <Select
                value={formData.assignee_id}
                onValueChange={(value) => setFormData({ ...formData, assignee_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="担当者を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">未割当</SelectItem>
                  {assignees.map((assignee) => (
                    <SelectItem key={assignee.id} value={assignee.id}>
                      {assignee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={saving} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {saving ? '保存中...' : '保存'}
              </Button>
              <Link href={`/tasks/${taskId}`} className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  <X className="h-4 w-4 mr-2" />
                  キャンセル
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}