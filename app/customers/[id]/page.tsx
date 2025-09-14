'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Customer, Project, Task, LineGroup, PlaudSummary } from '@/lib/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge, StatusType } from '@/components/ui/status-badge'
import { PriorityIndicator } from '@/components/ui/priority-indicator'
import { ActionButton } from '@/components/ui/action-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  ArrowLeft, Users, FolderOpen, CheckSquare, MessageSquare, 
  FileText, Plus, Calendar, ChevronDown, ChevronRight, Trash2, X
} from 'lucide-react'
import Link from 'next/link'

export default function CustomerDetailPage() {
  const params = useParams()
  const customerId = params.id as string
  const supabase = createClient()
  
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [lineGroups, setLineGroups] = useState<LineGroup[]>([])
  const [summaries, setSummaries] = useState<PlaudSummary[]>([])
  const [loading, setLoading] = useState(true)
  
  const [showSummaryForm, setShowSummaryForm] = useState(false)
  const [expandedSummaries, setExpandedSummaries] = useState<Set<string>>(new Set())
  const [newSummary, setNewSummary] = useState({
    title: '',
    summary_date: new Date().toISOString().split('T')[0],
    content: ''
  })

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

  const fetchData = async () => {
    try {
      // 顧客情報取得
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single()

      if (customerError) throw customerError
      setCustomer(customerData)

      // 関連プロジェクト取得
      const { data: projectRelations } = await supabase
        .from('project_customers')
        .select('project_id')
        .eq('customer_id', customerId)

      if (projectRelations && projectRelations.length > 0) {
        const projectIds = projectRelations.map((r: { project_id: string }) => r.project_id)
        
        const { data: projectsData } = await supabase
          .from('projects')
          .select('*')
          .in('id', projectIds)
          .order('priority', { ascending: false })

        setProjects(projectsData || [])

        // プロジェクトに関連するタスク取得
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('*')
          .in('project_id', projectIds)
          .order('priority', { ascending: false })

        setTasks(tasksData || [])

        // プロジェクトに関連するLINEグループ取得
        const { data: lineGroupRelations } = await supabase
          .from('project_line_groups')
          .select('line_group_id')
          .in('project_id', projectIds)

        if (lineGroupRelations && lineGroupRelations.length > 0) {
          const lineGroupIds = [...new Set(lineGroupRelations.map((r: { line_group_id: string }) => r.line_group_id))]
          
          const { data: lineGroupsData } = await supabase
            .from('line_groups')
            .select('*')
            .in('id', lineGroupIds)
            .order('name')

          setLineGroups(lineGroupsData || [])
        }
      }

      // Plaud要約取得
      const { data: summariesData } = await supabase
        .from('plaud_summaries')
        .select('*')
        .eq('customer_id', customerId)
        .order('summary_date', { ascending: false })

      setSummaries(summariesData || [])

    } catch (error) {
      console.error('データ取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSummary = async () => {
    if (!newSummary.title || !newSummary.content) return

    try {
      const { data, error } = await supabase
        .from('plaud_summaries')
        .insert({
          customer_id: customerId,
          title: newSummary.title,
          summary_date: newSummary.summary_date,
          content: newSummary.content
        })
        .select()
        .single()

      if (error) throw error

      setSummaries([data, ...summaries])
      setNewSummary({
        title: '',
        summary_date: new Date().toISOString().split('T')[0],
        content: ''
      })
      setShowSummaryForm(false)
    } catch (error) {
      console.error('要約追加エラー:', error)
      alert('要約の追加に失敗しました')
    }
  }

  const handleDeleteSummary = async (summaryId: string) => {
    if (!confirm('この要約を削除してもよろしいですか？')) return

    try {
      const { error } = await supabase
        .from('plaud_summaries')
        .delete()
        .eq('id', summaryId)

      if (error) throw error

      setSummaries(summaries.filter(s => s.id !== summaryId))
    } catch (error) {
      console.error('要約削除エラー:', error)
      alert('要約の削除に失敗しました')
    }
  }

  const toggleSummary = (summaryId: string) => {
    const newExpanded = new Set(expandedSummaries)
    if (newExpanded.has(summaryId)) {
      newExpanded.delete(summaryId)
    } else {
      newExpanded.add(summaryId)
    }
    setExpandedSummaries(newExpanded)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <Users className="h-8 w-8 animate-pulse text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="container mx-auto p-6">
        <p>顧客が見つかりません</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <Link href="/customers">
          <ActionButton
            icon={<ArrowLeft className="h-4 w-4" />}
            label="顧客一覧へ"
            variant="ghost"
            size="sm"
          />
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Users className="h-8 w-8 text-blue-600" />
          {customer.name}
        </h1>
        <p className="text-muted-foreground">
          作成日: {new Date(customer.created_at).toLocaleDateString('ja-JP')}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Plaud要約セクション */}
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Plaud要約
              </CardTitle>
              <ActionButton
                icon={<Plus className="h-4 w-4" />}
                label="要約を追加"
                size="sm"
                onClick={() => setShowSummaryForm(true)}
                tooltip="新しい要約を追加"
              />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {showSummaryForm && (
              <div className="mb-6 p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">タイトル</Label>
                      <Input
                        id="title"
                        value={newSummary.title}
                        onChange={(e) => setNewSummary({ ...newSummary, title: e.target.value })}
                        placeholder="要約のタイトル"
                      />
                    </div>
                    <div>
                      <Label htmlFor="date">日付</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newSummary.summary_date}
                        onChange={(e) => setNewSummary({ ...newSummary, summary_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="content">要約内容</Label>
                    <textarea
                      id="content"
                      className="w-full p-3 border rounded-md min-h-[200px]"
                      value={newSummary.content}
                      onChange={(e) => setNewSummary({ ...newSummary, content: e.target.value })}
                      placeholder="Plaudの要約を貼り付けてください"
                    />
                  </div>
                  <div className="flex gap-2">
                    <ActionButton
                      icon={<Plus className="h-4 w-4" />}
                      label="追加"
                      onClick={handleAddSummary}
                      variant="default"
                      size="sm"
                    />
                    <ActionButton
                      icon={<X className="h-4 w-4" />}
                      label="キャンセル"
                      onClick={() => {
                        setShowSummaryForm(false)
                        setNewSummary({
                          title: '',
                          summary_date: new Date().toISOString().split('T')[0],
                          content: ''
                        })
                      }}
                      variant="outline"
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {summaries.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">要約がありません</p>
              ) : (
                summaries.map((summary) => (
                  <div key={summary.id} className="border rounded-lg hover:shadow-md transition-shadow">
                    <button
                      onClick={() => toggleSummary(summary.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {expandedSummaries.has(summary.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <div className="text-left">
                          <h4 className="font-semibold">{summary.title}</h4>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(summary.summary_date).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                      </div>
                      <ActionButton
                        icon={<Trash2 className="h-4 w-4" />}
                        label=""
                        onClick={() => {
                          handleDeleteSummary(summary.id)
                        }}
                        variant="ghost"
                        size="sm"
                        tooltip="削除"
                      />
                    </button>
                    {expandedSummaries.has(summary.id) && (
                      <div className="px-4 pb-4 pt-0">
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                          <pre className="whitespace-pre-wrap text-sm">{summary.content}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* 関連プロジェクト */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-purple-600" />
              関連プロジェクト ({projects.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {projects.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">関連プロジェクトがありません</p>
              ) : (
                projects.map((project) => (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <div className="p-3 border-2 rounded-lg hover:border-primary hover:bg-primary/5 cursor-pointer transition-all">
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold">{project.name}</h4>
                        <StatusBadge status={project.status as StatusType} size="sm" />
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <PriorityIndicator priority={project.priority} size="sm" showLabel={false} />
                        {project.deadline && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(project.deadline).toLocaleDateString('ja-JP')}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* 関連タスク */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-blue-600" />
              関連タスク ({tasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {tasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">関連タスクがありません</p>
              ) : (
                tasks.map((task) => (
                  <Link key={task.id} href={`/tasks/${task.id}`}>
                    <div className="p-3 border-2 rounded-lg hover:border-primary hover:bg-primary/5 cursor-pointer transition-all">
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold text-sm">{task.title}</h4>
                        <StatusBadge status={task.status as StatusType} size="sm" />
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <PriorityIndicator priority={task.priority} size="sm" showLabel={false} />
                        {task.deadline && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.deadline).toLocaleDateString('ja-JP')}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* 関連LINEグループ */}
        <Card className="shadow-lg lg:col-span-2">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              関連LINEグループ ({lineGroups.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {lineGroups.length === 0 ? (
                <p className="text-muted-foreground text-center py-4 col-span-full">
                  関連LINEグループがありません
                </p>
              ) : (
                lineGroups.map((lineGroup) => (
                  <Link key={lineGroup.id} href={`/line-groups/${lineGroup.id}`}>
                    <div className="p-3 border-2 rounded-lg hover:border-primary hover:bg-primary/5 cursor-pointer transition-all">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-green-600" />
                        <h4 className="font-semibold">{lineGroup.name}</h4>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}