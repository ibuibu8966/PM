'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Task, Project, Memo, Proposal } from '@/lib/types/database'
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
  ArrowLeft, CheckSquare, FolderOpen, Calendar, Clock, StickyNote, 
  Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronUp, Lightbulb, ChevronRight
} from 'lucide-react'
import Link from 'next/link'

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id as string
  const supabase = createClient()
  
  const [task, setTask] = useState<Task | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [memos, setMemos] = useState<Memo[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddingMemo, setIsAddingMemo] = useState(false)
  const [newMemoContent, setNewMemoContent] = useState('')
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null)
  const [editingMemoContent, setEditingMemoContent] = useState('')
  const [expandedMemos, setExpandedMemos] = useState<Set<string>>(new Set())
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

      // プロジェクト情報取得
      if (taskData) {
        const { data: projectData } = await supabase
          .from('projects')
          .select('*')
          .eq('id', taskData.project_id)
          .single()
        
        setProject(projectData)
      }

      // メモ取得
      const { data: memosData, error: memosError } = await supabase
        .from('memos')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })

      if (memosError) throw memosError
      setMemos(memosData || [])

      // タスクの提案取得
      const { data: proposalsData } = await supabase
        .from('proposals')
        .select('*')
        .eq('task_id', taskId)
        .order('proposal_order')

      setProposals(proposalsData || [])

    } catch (error) {
      console.error('データ取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateTaskStatus = async (newStatus: StatusType) => {
    if (!task) return

    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', task.id)

    if (error) {
      console.error('ステータス更新エラー:', error)
    } else {
      setTask({ ...task, status: newStatus })
    }
  }

  const updateTaskPriority = async (newPriority: number) => {
    if (!task) return

    const { error } = await supabase
      .from('tasks')
      .update({ priority: newPriority })
      .eq('id', task.id)

    if (error) {
      console.error('優先度更新エラー:', error)
    } else {
      setTask({ ...task, priority: newPriority })
    }
  }

  const handleAddMemo = async () => {
    if (!newMemoContent.trim()) return

    try {
      const { data, error } = await supabase
        .from('memos')
        .insert({
          task_id: taskId,
          content: newMemoContent.trim()
        })
        .select()
        .single()

      if (error) throw error
      
      setMemos([data, ...memos])
      setNewMemoContent('')
      setIsAddingMemo(false)
    } catch (error) {
      console.error('メモ追加エラー:', error)
      alert('メモの追加に失敗しました')
    }
  }

  const handleUpdateMemo = async (memoId: string) => {
    if (!editingMemoContent.trim()) return

    try {
      const { error } = await supabase
        .from('memos')
        .update({ content: editingMemoContent.trim() })
        .eq('id', memoId)

      if (error) throw error
      
      setMemos(memos.map(m => 
        m.id === memoId ? { ...m, content: editingMemoContent.trim() } : m
      ))
      setEditingMemoId(null)
      setEditingMemoContent('')
    } catch (error) {
      console.error('メモ更新エラー:', error)
      alert('メモの更新に失敗しました')
    }
  }

  const handleDeleteMemo = async (memoId: string) => {
    if (!confirm('このメモを削除してもよろしいですか？')) return

    try {
      const { error } = await supabase
        .from('memos')
        .delete()
        .eq('id', memoId)

      if (error) throw error
      
      setMemos(memos.filter(m => m.id !== memoId))
    } catch (error) {
      console.error('メモ削除エラー:', error)
      alert('メモの削除に失敗しました')
    }
  }

  const toggleMemoExpanded = (memoId: string) => {
    const newExpanded = new Set(expandedMemos)
    if (newExpanded.has(memoId)) {
      newExpanded.delete(memoId)
    } else {
      newExpanded.add(memoId)
    }
    setExpandedMemos(newExpanded)
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
          task_id: taskId,
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

  const handleDeleteTask = async () => {
    if (!confirm('このタスクを削除してもよろしいですか？関連するメモも削除されます。')) return

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error
      
      router.push('/tasks')
    } catch (error) {
      console.error('タスク削除エラー:', error)
      alert('タスクの削除に失敗しました')
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
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6 flex justify-between items-center">
        <Link href="/tasks">
          <ActionButton
            icon={<ArrowLeft className="h-4 w-4" />}
            label="タスク一覧へ"
            variant="ghost"
            size="sm"
          />
        </Link>
        <div className="flex gap-2">
          <Link href={`/tasks/${taskId}/edit`}>
            <ActionButton
              icon={<Edit2 className="h-4 w-4" />}
              label="編集"
              variant="outline"
              tooltip="タスクを編集"
            />
          </Link>
          <ActionButton
            icon={<Trash2 className="h-4 w-4" />}
            label="削除"
            variant="destructive"
            onClick={handleDeleteTask}
            tooltip="タスクを削除"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* タスク詳細 */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <CheckSquare className="h-6 w-6 text-blue-600" />
                {task.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {task.description && (
                <div>
                  <Label className="text-muted-foreground mb-2">説明</Label>
                  <p className="text-sm whitespace-pre-wrap">{task.description}</p>
                </div>
              )}
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground mb-2">ステータス</Label>
                  <InlineStatusSelect 
                    value={task.status as StatusType} 
                    onChange={updateTaskStatus}
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground mb-2">優先度</Label>
                  <InlinePrioritySelect 
                    value={task.priority} 
                    onChange={updateTaskPriority}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {task.deadline && (
                  <div>
                    <Label className="text-muted-foreground mb-2 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      期限
                    </Label>
                    <p className="text-sm font-medium">
                      {new Date(task.deadline).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground mb-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    作成日
                  </Label>
                  <p className="text-sm font-medium">
                    {new Date(task.created_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 提案セクション */}
          <Card className="shadow-lg">
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

          {/* メモセクション */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <StickyNote className="h-5 w-5 text-yellow-600" />
                  メモ ({memos.length})
                </CardTitle>
                <ActionButton
                  icon={<Plus className="h-4 w-4" />}
                  label="メモを追加"
                  variant="default"
                  size="sm"
                  onClick={() => setIsAddingMemo(true)}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {/* 新規メモ追加フォーム */}
              {isAddingMemo && (
                <Card className="mb-4 border-2 border-primary">
                  <CardContent className="pt-4">
                    <Textarea
                      placeholder="メモを入力..."
                      value={newMemoContent}
                      onChange={(e) => setNewMemoContent(e.target.value)}
                      className="min-h-[100px] mb-3"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleAddMemo} size="sm" className="flex-1">
                        <Save className="h-4 w-4 mr-1" />
                        保存
                      </Button>
                      <Button 
                        onClick={() => {
                          setIsAddingMemo(false)
                          setNewMemoContent('')
                        }} 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-1" />
                        キャンセル
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* メモ一覧 */}
              <div className="space-y-3">
                {memos.length === 0 && !isAddingMemo ? (
                  <p className="text-center text-muted-foreground py-8">
                    メモがありません
                  </p>
                ) : (
                  memos.map((memo) => (
                    <Card key={memo.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4">
                        {editingMemoId === memo.id ? (
                          <div>
                            <Textarea
                              value={editingMemoContent}
                              onChange={(e) => setEditingMemoContent(e.target.value)}
                              className="min-h-[100px] mb-3"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button 
                                onClick={() => handleUpdateMemo(memo.id)} 
                                size="sm"
                                className="flex-1"
                              >
                                <Save className="h-4 w-4 mr-1" />
                                更新
                              </Button>
                              <Button 
                                onClick={() => {
                                  setEditingMemoId(null)
                                  setEditingMemoContent('')
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
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs text-muted-foreground">
                                {new Date(memo.created_at).toLocaleString('ja-JP')}
                              </span>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingMemoId(memo.id)
                                    setEditingMemoContent(memo.content)
                                  }}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteMemo(memo.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div 
                              className={`text-sm whitespace-pre-wrap ${
                                !expandedMemos.has(memo.id) && memo.content.length > 200 
                                  ? 'line-clamp-3' 
                                  : ''
                              }`}
                            >
                              {memo.content}
                            </div>
                            {memo.content.length > 200 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleMemoExpanded(memo.id)}
                                className="mt-2 p-0 h-auto text-primary"
                              >
                                {expandedMemos.has(memo.id) ? (
                                  <>
                                    <ChevronUp className="h-4 w-4 mr-1" />
                                    折りたたむ
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-4 w-4 mr-1" />
                                    もっと見る
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* プロジェクト情報 */}
          {project && (
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FolderOpen className="h-5 w-5 text-purple-600" />
                  所属プロジェクト
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <Link href={`/projects/${project.id}`}>
                  <div className="p-3 border-2 rounded-lg hover:border-primary hover:bg-primary/5 cursor-pointer transition-all">
                    <h4 className="font-semibold mb-2">{project.name}</h4>
                    <div className="space-y-2">
                      <StatusBadge status={project.status as StatusType} size="sm" />
                      <PriorityIndicator priority={project.priority} size="sm" />
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}