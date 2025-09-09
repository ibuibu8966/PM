'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Customer, LineGroup } from '@/lib/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'

export default function NewProjectPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [lineGroups, setLineGroups] = useState<LineGroup[]>([])
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 5,
    status: 'not_started',
    deadline: '',
    selectedCustomers: [] as string[],
    selectedLineGroups: [] as string[]
  })

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
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
    } catch (error) {
      console.error('データ取得エラー:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // プロジェクト作成
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: formData.name,
          description: formData.description,
          priority: formData.priority,
          status: formData.status,
          deadline: formData.deadline || null
        })
        .select()
        .single()

      if (projectError) throw projectError

      // 顧客との関連を作成
      if (formData.selectedCustomers.length > 0) {
        const customerRelations = formData.selectedCustomers.map(customerId => ({
          project_id: projectData.id,
          customer_id: customerId
        }))
        
        const { error: customerError } = await supabase
          .from('project_customers')
          .insert(customerRelations)
        
        if (customerError) throw customerError
      }

      // LINEグループとの関連を作成
      if (formData.selectedLineGroups.length > 0) {
        const lineGroupRelations = formData.selectedLineGroups.map(lineGroupId => ({
          project_id: projectData.id,
          line_group_id: lineGroupId
        }))
        
        const { error: lineGroupError } = await supabase
          .from('project_line_groups')
          .insert(lineGroupRelations)
        
        if (lineGroupError) throw lineGroupError
      }

      router.push('/projects')
    } catch (error) {
      console.error('プロジェクト作成エラー:', error)
      alert('プロジェクトの作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const toggleCustomer = (customerId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedCustomers: prev.selectedCustomers.includes(customerId)
        ? prev.selectedCustomers.filter(id => id !== customerId)
        : [...prev.selectedCustomers, customerId]
    }))
  }

  const toggleLineGroup = (lineGroupId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedLineGroups: prev.selectedLineGroups.includes(lineGroupId)
        ? prev.selectedLineGroups.filter(id => id !== lineGroupId)
        : [...prev.selectedLineGroups, lineGroupId]
    }))
  }


  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <Link href="/projects">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">新規プロジェクト作成</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">プロジェクト名 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              <Label htmlFor="status">ステータス</Label>
              <select
                id="status"
                className="w-full px-3 py-2 border rounded-md"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="not_started">未着手</option>
                <option value="waiting_confirmation">確認待ち</option>
                <option value="in_progress">進行中</option>
                <option value="completed">完了</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>関連付け</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>顧客</Label>
              <div className="space-y-2 mt-2 max-h-40 overflow-y-auto border rounded-md p-3">
                {customers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">顧客が登録されていません</p>
                ) : (
                  customers.map((customer) => (
                    <div key={customer.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`customer-${customer.id}`}
                        checked={formData.selectedCustomers.includes(customer.id)}
                        onCheckedChange={() => toggleCustomer(customer.id)}
                      />
                      <Label
                        htmlFor={`customer-${customer.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {customer.name}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <Label>LINEグループ</Label>
              <div className="space-y-2 mt-2 max-h-40 overflow-y-auto border rounded-md p-3">
                {lineGroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">LINEグループが登録されていません</p>
                ) : (
                  lineGroups.map((lineGroup) => (
                    <div key={lineGroup.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`linegroup-${lineGroup.id}`}
                        checked={formData.selectedLineGroups.includes(lineGroup.id)}
                        onCheckedChange={() => toggleLineGroup(lineGroup.id)}
                      />
                      <Label
                        htmlFor={`linegroup-${lineGroup.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {lineGroup.name}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>


        <div className="flex gap-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? '作成中...' : 'プロジェクトを作成'}
          </Button>
          <Link href="/projects" className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              キャンセル
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}