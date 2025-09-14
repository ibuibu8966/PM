'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Project, Customer, LineGroup } from '@/lib/types/database'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft } from 'lucide-react'
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
    assigneeId: ''
  })

  useEffect(() => {
    fetchInitialData()
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
      // タスク作成データの準備
      const taskData: Record<string, unknown> = {
        title: formData.title,
        description: formData.description,
        project_id: formData.projectId,
        priority: formData.priority,
        status: 'not_started',
        deadline: formData.deadline || null
      }

      // 担当者IDがある場合のみ追加（カラムが存在しない場合のエラーを回避）
      if (formData.assigneeId) {
        taskData.assignee_id = formData.assigneeId
      }

      const { error: taskError } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single()

      if (taskError) throw taskError


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