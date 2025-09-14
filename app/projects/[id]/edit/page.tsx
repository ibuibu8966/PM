'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Project, Customer, LineGroup } from '@/lib/types/database'
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
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select'
import { ActionButton } from '@/components/ui/action-button'
import { LoadingSpinner, LoadingOverlay } from '@/components/ui/loading-spinner'
import { useToast } from '@/contexts/toast-context'
import { ArrowLeft, Save, X, FolderOpen, Users, MessageSquare } from 'lucide-react'
import Link from 'next/link'

export default function EditProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const supabase = createClient()
  const { showToast } = useToast()
  
  const [project, setProject] = useState<Project | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [lineGroups, setLineGroups] = useState<LineGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'not_started',
    priority: 5,
    deadline: '',
    selectedCustomers: [] as string[],
    selectedLineGroups: [] as string[]
  })

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const fetchData = async () => {
    try {
      // プロジェクト情報取得
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (projectError) throw projectError
      
      setProject(projectData)

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

      // 関連顧客取得
      const { data: customerRelations } = await supabase
        .from('project_customers')
        .select('customer_id')
        .eq('project_id', projectId)
      const customerIds = customerRelations?.map((r: { customer_id: string }) => r.customer_id) || []

      // 関連LINEグループ取得
      const { data: lineGroupRelations } = await supabase
        .from('project_line_groups')
        .select('line_group_id')
        .eq('project_id', projectId)
      const lineGroupIds = lineGroupRelations?.map((r: { line_group_id: string }) => r.line_group_id) || []

      // フォームデータを一度に設定
      setFormData({
        name: projectData.name,
        description: projectData.description || '',
        status: projectData.status,
        priority: projectData.priority,
        deadline: projectData.deadline ? projectData.deadline.split('T')[0] : '',
        selectedCustomers: customerIds,
        selectedLineGroups: lineGroupIds
      })

    } catch (error) {
      console.error('データ取得エラー:', error)
      alert('データの取得に失敗しました')
      router.push('/projects')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      showToast('プロジェクト名は必須です', 'error')
      return
    }

    setSaving(true)
    try {
      // プロジェクト更新
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          status: formData.status,
          priority: formData.priority,
          deadline: formData.deadline || null
        })
        .eq('id', projectId)

      if (updateError) throw updateError

      // 顧客関連を更新
      await supabase
        .from('project_customers')
        .delete()
        .eq('project_id', projectId)

      if (formData.selectedCustomers.length > 0) {
        const customerRelations = formData.selectedCustomers.map(customerId => ({
          project_id: projectId,
          customer_id: customerId
        }))
        await supabase
          .from('project_customers')
          .insert(customerRelations)
      }

      // LINEグループ関連を更新
      await supabase
        .from('project_line_groups')
        .delete()
        .eq('project_id', projectId)

      if (formData.selectedLineGroups.length > 0) {
        const lineGroupRelations = formData.selectedLineGroups.map(lineGroupId => ({
          project_id: projectId,
          line_group_id: lineGroupId
        }))
        await supabase
          .from('project_line_groups')
          .insert(lineGroupRelations)
      }
      
      showToast('プロジェクトを更新しました', 'success')
      router.push(`/projects/${projectId}`)
    } catch (error) {
      console.error('更新エラー:', error)
      showToast('プロジェクトの更新に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }


  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <FolderOpen className="h-8 w-8 animate-pulse text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="container mx-auto p-6">
        <p>プロジェクトが見つかりません</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="mb-6">
        <Link href={`/projects/${projectId}`}>
          <ActionButton
            icon={<ArrowLeft className="h-4 w-4" />}
            label="戻る"
            variant="ghost"
            size="sm"
          />
        </Link>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <FolderOpen className="h-6 w-6 text-purple-600" />
            プロジェクトを編集
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">プロジェクト名 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="プロジェクト名を入力"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="プロジェクトの詳細を入力"
                className="min-h-[100px]"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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

            {/* 顧客選択 */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-600" />
                関連顧客
              </Label>
              <SearchableMultiSelect
                options={customers}
                selected={formData.selectedCustomers}
                onChange={(selected) => setFormData({ ...formData, selectedCustomers: selected })}
                placeholder="顧客を選択..."
                searchPlaceholder="顧客名で検索..."
              />
            </div>

            {/* LINEグループ選択 */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-green-600" />
                関連LINEグループ
              </Label>
              <SearchableMultiSelect
                options={lineGroups}
                selected={formData.selectedLineGroups}
                onChange={(selected) => setFormData({ ...formData, selectedLineGroups: selected })}
                placeholder="LINEグループを選択..."
                searchPlaceholder="グループ名で検索..."
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    保存
                  </>
                )}
              </Button>
              <Link href={`/projects/${projectId}`} className="flex-1">
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