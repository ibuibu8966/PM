'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Project, Customer, LineGroup } from '@/lib/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CardText } from '@/components/ui/card-text'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { StatusBadge, StatusType } from '@/components/ui/status-badge'
import { InlineStatusSelect } from '@/components/ui/inline-status-select'
import { useToast } from '@/contexts/toast-context'
import { PriorityIndicator } from '@/components/ui/priority-indicator'
import { ActionButton } from '@/components/ui/action-button'
import { Plus, Search, Calendar, Users, MessageSquare, FolderOpen, Filter, ArrowUp, ChevronDown, ChevronUp, Edit2, Clock } from 'lucide-react'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card-detail'
import Link from 'next/link'

export default function ProjectsPage() {
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectRelations, setProjectRelations] = useState<{
    [key: string]: { customers: Customer[], lineGroups: LineGroup[] }
  }>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'priority' | 'deadline'>('priority')
  const [showFilters, setShowFilters] = useState(false)
  const supabase = createClient()
  const { showToast } = useToast()

  useEffect(() => {
    // URLパラメータからフィルタを設定
    const filter = searchParams.get('filter')

    if (filter === 'in-progress') {
      setStatusFilter('in_progress')
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])


  const handleStatusUpdate = async (projectId: string, newStatus: StatusType) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', projectId)

      if (error) throw error

      // ローカルステートを更新
      setProjects(prev => prev.map(p =>
        p.id === projectId ? { ...p, status: newStatus } : p
      ))
      showToast('ステータスを更新しました', 'success')
    } catch (error) {
      console.error('ステータス更新エラー:', error)
      showToast('ステータスの更新に失敗しました', 'error')
      throw error
    }
  }

  const fetchData = async () => {
    try {
      // プロジェクト取得
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('priority', { ascending: false })
        .order('deadline', { ascending: true })

      if (projectsError) throw projectsError
      setProjects(projectsData || [])

      // 各プロジェクトの関連情報を並列で取得
      if (projectsData && projectsData.length > 0) {
        const relations: typeof projectRelations = {}
        
        // すべてのプロジェクトの関連情報を並列で取得
        const promises = projectsData.map(async (project: Project) => {
          const [customerResult, lineGroupResult] = await Promise.all([
            supabase
              .from('project_customers')
              .select('*, customers(*)')
              .eq('project_id', project.id),
            supabase
              .from('project_line_groups')
              .select('*, line_groups(*)')
              .eq('project_id', project.id)
          ])
          
          return {
            projectId: project.id,
            customers: customerResult.data?.map((r: { customers: Customer }) => r.customers).filter(Boolean) || [],
            lineGroups: lineGroupResult.data?.map((r: { line_groups: LineGroup }) => r.line_groups).filter(Boolean) || []
          }
        })
        
        const results = await Promise.all(promises)
        
        results.forEach((result: { projectId: string; customers: Customer[]; lineGroups: LineGroup[] }) => {
          relations[result.projectId] = {
            customers: result.customers,
            lineGroups: result.lineGroups
          }
        })
        
        setProjectRelations(relations)
      }
    } catch (error) {
      console.error('データ取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }


  const filteredProjects = projects
    .filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.description?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        return b.priority - a.priority
      } else {
        // deadline順（nullは最後に）
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      }
    })

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <FolderOpen className="h-5 w-5 animate-pulse text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-2 md:p-3 max-w-7xl">
      <div className="mb-2 md:mb-2 flex justify-between items-center">
        <div>
          <h1 className="text-base md:text-xl font-bold mb-1 md:mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            プロジェクト一覧
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">すべてのプロジェクトを管理</p>
        </div>
        <Link href="/projects/new">
          <ActionButton
            icon={<Plus className="h-4 w-4" />}
            label="新規プロジェクト"
            tooltip="プロジェクトを作成"
            variant="default"
          />
        </Link>
      </div>

      {/* フィルター - モバイル向け統合トグル */}
      <div className="mb-2 md:hidden relative">
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="outline"
          size="sm"
          className="w-full justify-between h-10"
        >
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            検索・フィルター・並び替え
            {(searchTerm || statusFilter !== 'all') && <span className="text-primary">(適用中)</span>}
          </span>
          {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        
        {showFilters && (
          <div className="absolute top-full left-0 right-0 z-40 mt-2 space-y-3 p-3 bg-background border rounded-lg shadow-lg">
            {/* 1段目 - 検索 */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">検索</label>
              <Input
                placeholder="プロジェクトを検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* 2段目 - ステータスフィルター */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">ステータス</label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => setStatusFilter('all')}
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs px-2"
                >
                  すべて
                </Button>
                <Button
                  onClick={() => setStatusFilter('not_started')}
                  variant={statusFilter === 'not_started' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs px-2"
                >
                  未着手
                </Button>
                <Button
                  onClick={() => setStatusFilter('waiting_confirmation')}
                  variant={statusFilter === 'waiting_confirmation' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs px-2"
                >
                  確認待ち
                </Button>
                <Button
                  onClick={() => setStatusFilter('in_progress')}
                  variant={statusFilter === 'in_progress' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs px-2"
                >
                  進行中
                </Button>
              </div>
            </div>

            {/* 3段目 - 並び替え */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">並び替え</label>
              <div className="flex gap-2">
                <Button
                  onClick={() => setSortBy('priority')}
                  variant={sortBy === 'priority' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs gap-1 px-2"
                >
                  <ArrowUp className="h-3 w-3" />
                  優先度順
                </Button>
                <Button
                  onClick={() => setSortBy('deadline')}
                  variant={sortBy === 'deadline' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs gap-1 px-2"
                >
                  <Calendar className="h-3 w-3" />
                  期限順
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* デスクトップ用フィルター */}
      <div className="hidden md:block mb-2 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="プロジェクトを検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setStatusFilter('all')}
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
          >
            すべて
          </Button>
          <Button
            onClick={() => setStatusFilter('not_started')}
            variant={statusFilter === 'not_started' ? 'default' : 'outline'}
            size="sm"
          >
            未着手
          </Button>
          <Button
            onClick={() => setStatusFilter('waiting_confirmation')}
            variant={statusFilter === 'waiting_confirmation' ? 'default' : 'outline'}
            size="sm"
          >
            確認待ち
          </Button>
          <Button
            onClick={() => setStatusFilter('in_progress')}
            variant={statusFilter === 'in_progress' ? 'default' : 'outline'}
            size="sm"
          >
            進行中
          </Button>
          <div className="w-px bg-border mx-2" />
          <Button
            onClick={() => setSortBy('priority')}
            variant={sortBy === 'priority' ? 'default' : 'outline'}
            size="sm"
            className="gap-1"
          >
            <ArrowUp className="h-4 w-4" />
            優先度順
          </Button>
          <Button
            onClick={() => setSortBy('deadline')}
            variant={sortBy === 'deadline' ? 'default' : 'outline'}
            size="sm"
            className="gap-1"
          >
            <Calendar className="h-4 w-4" />
            期限順
          </Button>
        </div>
      </div>

      {/* プロジェクトリスト */}
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">プロジェクトが見つかりません</p>
            </CardContent>
          </Card>
        ) : (
          filteredProjects.map((project) => (
            <HoverCard key={project.id}>
              <HoverCardTrigger asChild>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <Link href={`/projects/${project.id}`}>
                    <CardHeader className="p-2">
                      <div className="flex items-start gap-1.5">
                        <FolderOpen className="h-3.5 w-3.5 text-purple-600 mt-0.5 flex-shrink-0" />
                        <CardTitle className="text-sm hover:text-primary transition-colors flex-1">
                          <CardText lines={1}>{project.name}</CardText>
                        </CardTitle>
                      </div>
                    </CardHeader>
                  </Link>
                  <CardContent className="pt-0 px-2 pb-2">
                    <div className="flex items-center gap-1 mb-1" onClick={(e) => e.stopPropagation()}>
                      <InlineStatusSelect
                        value={project.status as StatusType}
                        onChange={(newStatus) => handleStatusUpdate(project.id, newStatus)}
                      />
                      <PriorityIndicator priority={project.priority} size="sm" showLabel={false} />
                    </div>
                    {project.deadline && (
                      <Link href={`/projects/${project.id}`}>
                        <div className="text-2xs text-muted-foreground flex items-center gap-0.5">
                          <Calendar className="h-2.5 w-2.5" />
                          {new Date(project.deadline).toLocaleDateString('ja-JP')}
                        </div>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              </HoverCardTrigger>
              <HoverCardContent className="w-96" align="start">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <FolderOpen className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <h4 className="text-base font-semibold">
                          <CardText lines={2}>{project.name}</CardText>
                        </h4>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            <CardText lines={3}>{project.description}</CardText>
                          </p>
                        )}
                      </div>
                    </div>
                    <Link href={`/projects/${project.id}/edit`}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">ステータス:</span>
                      <div className="mt-1">
                        <StatusBadge status={project.status as StatusType} />
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">優先度:</span>
                      <div className="mt-1">
                        <PriorityIndicator priority={project.priority} />
                      </div>
                    </div>
                    {project.deadline && (
                      <div>
                        <span className="text-muted-foreground">期限:</span>
                        <div className="mt-1 flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(project.deadline).toLocaleDateString('ja-JP')}
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">作成日:</span>
                      <div className="mt-1 flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(project.created_at).toLocaleDateString('ja-JP')}
                      </div>
                    </div>
                  </div>

                  {/* 関連情報 */}
                  {projectRelations[project.id]?.customers.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium mb-2 flex items-center gap-1">
                        <Users className="h-4 w-4 text-blue-600" />
                        関連顧客
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {projectRelations[project.id].customers.map(customer => (
                          <Link key={customer.id} href={`/customers/${customer.id}`}>
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs transition-colors">
                              {customer.name}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {projectRelations[project.id]?.lineGroups.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium mb-2 flex items-center gap-1">
                        <MessageSquare className="h-4 w-4 text-green-600" />
                        LINEグループ
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {projectRelations[project.id].lineGroups.map(lineGroup => (
                          <Link key={lineGroup.id} href={`/line-groups/${lineGroup.id}`}>
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded text-xs transition-colors">
                              {lineGroup.name}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </HoverCardContent>
            </HoverCard>
          ))
        )}
      </div>
    </div>
  )
}