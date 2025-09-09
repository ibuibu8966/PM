'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Project, Task, Customer, LineGroup, Proposal } from '@/lib/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { StatusBadge, StatusType } from '@/components/ui/status-badge'
import { PriorityIndicator } from '@/components/ui/priority-indicator'
import { InlineStatusSelect } from '@/components/ui/inline-status-select'
import { InlinePrioritySelect } from '@/components/ui/inline-priority-select'
import { ActionButton } from '@/components/ui/action-button'
import { 
  ArrowLeft, FolderOpen, CheckSquare, Users, MessageSquare, 
  Lightbulb, Calendar, Plus, ChevronDown, ChevronRight,
  Edit2, Trash2, Save, X
} from 'lucide-react'
import Link from 'next/link'

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()
  
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [lineGroups, setLineGroups] = useState<LineGroup[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedProposals, setExpandedProposals] = useState<Set<string>>(new Set())
  const [isAddingProposal, setIsAddingProposal] = useState(false)
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null)
  const [proposalForm, setProposalForm] = useState({
    title: '',
    content: '',
    reason: ''
  })

  useEffect(() => {
    fetchData()
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

      // 関連タスク取得
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('priority', { ascending: false })
        .order('deadline', { ascending: true })

      setTasks(tasksData || [])

      // 関連顧客取得
      const { data: customerRelations } = await supabase
        .from('project_customers')
        .select('customer_id')
        .eq('project_id', projectId)

      if (customerRelations && customerRelations.length > 0) {
        const customerIds = customerRelations.map(r => r.customer_id)
        
        const { data: customersData } = await supabase
          .from('customers')
          .select('*')
          .in('id', customerIds)
          .order('name')

        setCustomers(customersData || [])
      }

      // 関連LINEグループ取得
      const { data: lineGroupRelations } = await supabase
        .from('project_line_groups')
        .select('line_group_id')
        .eq('project_id', projectId)

      if (lineGroupRelations && lineGroupRelations.length > 0) {
        const lineGroupIds = lineGroupRelations.map(r => r.line_group_id)
        
        const { data: lineGroupsData } = await supabase
          .from('line_groups')
          .select('*')
          .in('id', lineGroupIds)
          .order('name')

        setLineGroups(lineGroupsData || [])
      }

      // プロジェクトの提案取得
      const { data: proposalsData } = await supabase
        .from('proposals')
        .select('*')
        .eq('project_id', projectId)
        .order('proposal_order')

      setProposals(proposalsData || [])

    } catch (error) {
      console.error('データ取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateProjectStatus = async (newStatus: StatusType) => {
    if (!project) return
    
    const { error } = await supabase
      .from('projects')
      .update({ status: newStatus })
      .eq('id', projectId)

    if (error) {
      console.error('ステータス更新エラー:', error)
      throw error
    }

    setProject({ ...project, status: newStatus })
  }

  const updateProjectPriority = async (newPriority: number) => {
    if (!project) return
    
    const { error } = await supabase
      .from('projects')
      .update({ priority: newPriority })
      .eq('id', projectId)

    if (error) {
      console.error('優先度更新エラー:', error)
      throw error
    }

    setProject({ ...project, priority: newPriority })
  }

  const toggleProposal = (proposalId: string) => {
    const newExpanded = new Set(expandedProposals)
    if (newExpanded.has(proposalId)) {
      newExpanded.delete(proposalId)
    } else {
      newExpanded.add(proposalId)
    }
    setExpandedProposals(newExpanded)
  }

  const handleAddProposal = async () => {
    if (!proposalForm.title.trim() || !proposalForm.content.trim()) {
      alert('タイトルと内容は必須です')
      return
    }

    try {
      const nextOrder = proposals.length + 1
      const { data, error } = await supabase
        .from('proposals')
        .insert({
          project_id: projectId,
          title: proposalForm.title.trim(),
          content: proposalForm.content.trim(),
          reason: proposalForm.reason.trim() || null,
          proposal_order: nextOrder
        })
        .select()
        .single()

      if (error) throw error
      
      setProposals([...proposals, data])
      setProposalForm({ title: '', content: '', reason: '' })
      setIsAddingProposal(false)
    } catch (error) {
      console.error('提案追加エラー:', error)
      alert('提案の追加に失敗しました')
    }
  }

  const handleUpdateProposal = async (proposalId: string) => {
    if (!proposalForm.title.trim() || !proposalForm.content.trim()) {
      alert('タイトルと内容は必須です')
      return
    }

    try {
      const { error } = await supabase
        .from('proposals')
        .update({
          title: proposalForm.title.trim(),
          content: proposalForm.content.trim(),
          reason: proposalForm.reason.trim() || null
        })
        .eq('id', proposalId)

      if (error) throw error
      
      setProposals(proposals.map(p => 
        p.id === proposalId 
          ? { ...p, title: proposalForm.title, content: proposalForm.content, reason: proposalForm.reason }
          : p
      ))
      setEditingProposalId(null)
      setProposalForm({ title: '', content: '', reason: '' })
    } catch (error) {
      console.error('提案更新エラー:', error)
      alert('提案の更新に失敗しました')
    }
  }

  const handleDeleteProposal = async (proposalId: string) => {
    if (!confirm('この提案を削除してもよろしいですか？')) return

    try {
      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', proposalId)

      if (error) throw error
      
      setProposals(proposals.filter(p => p.id !== proposalId))
    } catch (error) {
      console.error('提案削除エラー:', error)
      alert('提案の削除に失敗しました')
    }
  }

  const startEditProposal = (proposal: Proposal) => {
    setEditingProposalId(proposal.id)
    setProposalForm({
      title: proposal.title,
      content: proposal.content,
      reason: proposal.reason || ''
    })
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
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="mb-4 md:mb-6">
        <Link href="/projects">
          <ActionButton
            icon={<ArrowLeft className="h-4 w-4" />}
            label="プロジェクト一覧へ"
            variant="ghost"
            size="sm"
          />
        </Link>
      </div>

      <div className="mb-4 md:mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <FolderOpen className="h-8 w-8 text-purple-600" />
              {project.name}
            </h1>
            {project.description && (
              <p className="text-lg text-muted-foreground mb-4">{project.description}</p>
            )}
            <div className="flex items-center gap-4">
              <InlineStatusSelect 
                value={project.status as StatusType} 
                onChange={updateProjectStatus}
              />
              <InlinePrioritySelect 
                value={project.priority} 
                onChange={updateProjectPriority}
              />
              {project.deadline && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  締切: {new Date(project.deadline).toLocaleDateString('ja-JP')}
                </span>
              )}
            </div>
          </div>
          <Link href={`/projects/${projectId}/edit`}>
            <ActionButton
              icon={<Plus className="h-4 w-4" />}
              label="編集"
              variant="outline"
              tooltip="プロジェクトを編集"
            />
          </Link>
        </div>
      </div>

      {/* 提案セクション */}
      <Card className="mb-4 md:mb-6 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              提案・複数案 ({proposals.length})
            </CardTitle>
            {proposals.length < 3 && (
              <ActionButton
                icon={<Plus className="h-4 w-4" />}
                label="提案を追加"
                variant="default"
                size="sm"
                onClick={() => setIsAddingProposal(true)}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* 新規提案追加フォーム */}
          {isAddingProposal && (
            <Card className="mb-4 border-2 border-primary">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="new-title">タイトル *</Label>
                    <Input
                      id="new-title"
                      value={proposalForm.title}
                      onChange={(e) => setProposalForm({ ...proposalForm, title: e.target.value })}
                      placeholder="提案のタイトル"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-content">内容 *</Label>
                    <Textarea
                      id="new-content"
                      value={proposalForm.content}
                      onChange={(e) => setProposalForm({ ...proposalForm, content: e.target.value })}
                      placeholder="提案の詳細内容"
                      className="min-h-[100px]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-reason">理由</Label>
                    <Textarea
                      id="new-reason"
                      value={proposalForm.reason}
                      onChange={(e) => setProposalForm({ ...proposalForm, reason: e.target.value })}
                      placeholder="なぜこの案を考えたか"
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddProposal} size="sm" className="flex-1">
                      <Save className="h-4 w-4 mr-1" />
                      保存
                    </Button>
                    <Button 
                      onClick={() => {
                        setIsAddingProposal(false)
                        setProposalForm({ title: '', content: '', reason: '' })
                      }} 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-1" />
                      キャンセル
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {proposals.length === 0 && !isAddingProposal ? (
              <p className="text-center text-muted-foreground py-8">
                提案がありません
              </p>
            ) : (
              proposals.map((proposal) => (
                <div key={proposal.id} className="border rounded-lg">
                  {editingProposalId === proposal.id ? (
                    <div className="p-4 space-y-3">
                      <div>
                        <Label htmlFor={`edit-title-${proposal.id}`}>タイトル *</Label>
                        <Input
                          id={`edit-title-${proposal.id}`}
                          value={proposalForm.title}
                          onChange={(e) => setProposalForm({ ...proposalForm, title: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit-content-${proposal.id}`}>内容 *</Label>
                        <Textarea
                          id={`edit-content-${proposal.id}`}
                          value={proposalForm.content}
                          onChange={(e) => setProposalForm({ ...proposalForm, content: e.target.value })}
                          className="min-h-[100px]"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit-reason-${proposal.id}`}>理由</Label>
                        <Textarea
                          id={`edit-reason-${proposal.id}`}
                          value={proposalForm.reason}
                          onChange={(e) => setProposalForm({ ...proposalForm, reason: e.target.value })}
                          className="min-h-[80px]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleUpdateProposal(proposal.id)} size="sm" className="flex-1">
                          <Save className="h-4 w-4 mr-1" />
                          更新
                        </Button>
                        <Button 
                          onClick={() => {
                            setEditingProposalId(null)
                            setProposalForm({ title: '', content: '', reason: '' })
                          }} 
                          variant="outline" 
                          size="sm"
                          className="flex-1"
                        >
                          <X className="h-4 w-4 mr-1" />
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => toggleProposal(proposal.id)}
                        className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {expandedProposals.has(proposal.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div className="text-left">
                            <h4 className="font-semibold">
                              提案{proposal.proposal_order}: {proposal.title}
                            </h4>
                            {proposal.is_adopted && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full ml-2">
                                採用
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditProposal(proposal)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProposal(proposal.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </button>
                      {expandedProposals.has(proposal.id) && (
                        <div className="px-4 pb-4 pt-0 space-y-3">
                          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                            <p className="text-sm font-medium mb-1">内容:</p>
                            <p className="text-sm whitespace-pre-wrap">{proposal.content}</p>
                          </div>
                          {proposal.reason && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                              <p className="text-sm font-medium mb-1">理由:</p>
                              <p className="text-sm whitespace-pre-wrap">{proposal.reason}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 関連タスク */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-blue-600" />
                タスク ({tasks.length})
              </CardTitle>
              <Link href={`/tasks/new?project=${projectId}`}>
                <ActionButton
                  icon={<Plus className="h-4 w-4" />}
                  label="追加"
                  size="sm"
                  tooltip="タスクを追加"
                />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {tasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">タスクがありません</p>
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

        {/* 関連顧客・LINEグループ */}
        <div className="space-y-6">
          {/* 顧客 */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                顧客 ({customers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {customers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">顧客が設定されていません</p>
                ) : (
                  customers.map((customer) => (
                    <Link key={customer.id} href={`/customers/${customer.id}`}>
                      <div className="p-3 border-2 rounded-lg hover:border-primary hover:bg-primary/5 cursor-pointer transition-all">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          <h4 className="font-semibold">{customer.name}</h4>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* LINEグループ */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                LINEグループ ({lineGroups.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {lineGroups.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">LINEグループが設定されていません</p>
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
    </div>
  )
}