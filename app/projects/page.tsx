'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Project, Customer, LineGroup } from '@/lib/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { StatusBadge, StatusType } from '@/components/ui/status-badge'
import { PriorityIndicator } from '@/components/ui/priority-indicator'
import { InlineStatusSelect } from '@/components/ui/inline-status-select'
import { InlinePrioritySelect } from '@/components/ui/inline-priority-select'
import { ActionButton } from '@/components/ui/action-button'
import { Plus, Search, Calendar, Users, MessageSquare, FolderOpen, ArrowRight, Edit, Filter, ArrowUp, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

export default function ProjectsPage() {
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

  useEffect(() => {
    fetchData()
  }, [])

  const updateProjectStatus = async (projectId: string, newStatus: StatusType) => {
    const { error } = await supabase
      .from('projects')
      .update({ status: newStatus })
      .eq('id', projectId)

    if (error) {
      console.error('ステータス更新エラー:', error)
      throw error
    }

    // ローカルステートを更新
    setProjects(prev => prev.map(p => 
      p.id === projectId ? { ...p, status: newStatus } : p
    ))
  }

  const updateProjectPriority = async (projectId: string, newPriority: number) => {
    const { error } = await supabase
      .from('projects')
      .update({ priority: newPriority })
      .eq('id', projectId)

    if (error) {
      console.error('優先度更新エラー:', error)
      throw error
    }

    // ローカルステートを更新
    setProjects(prev => prev.map(p => 
      p.id === projectId ? { ...p, priority: newPriority } : p
    ))
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
        const promises = projectsData.map(async (project) => {
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
            customers: customerResult.data?.map(r => r.customers).filter(Boolean) || [],
            lineGroups: lineGroupResult.data?.map(r => r.line_groups).filter(Boolean) || []
          }
        })
        
        const results = await Promise.all(promises)
        
        results.forEach(result => {
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
          <FolderOpen className="h-8 w-8 animate-pulse text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="mb-4 md:mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
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
      <div className="mb-4 md:hidden relative">
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
      <div className="hidden md:block mb-4 space-y-3">
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
      <div className="grid gap-4">
        {filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">プロジェクトが見つかりません</p>
            </CardContent>
          </Card>
        ) : (
          filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-all duration-300 border hover:border-primary/30">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link href={`/projects/${project.id}`}>
                      <h3 className="text-lg md:text-xl font-bold hover:text-primary cursor-pointer transition-colors flex items-center gap-2">
                        <FolderOpen className="h-4 md:h-5 w-4 md:w-5 text-purple-600 flex-shrink-0" />
                        <span className="line-clamp-2">{project.name}</span>
                      </h3>
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-3 md:mt-4 pl-6 md:pl-7">
                      <InlinePrioritySelect 
                        value={project.priority} 
                        onChange={(priority) => updateProjectPriority(project.id, priority)}
                      />
                      {project.deadline && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(project.deadline).toLocaleDateString('ja-JP')}
                        </span>
                      )}
                    </div>
                    
                    {/* 関連情報 - クリック可能に */}
                    <div className="flex flex-wrap gap-2 mt-2 md:mt-3 pl-6 md:pl-7">
                      {projectRelations[project.id]?.customers.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {projectRelations[project.id].customers.map(customer => (
                            <Link key={customer.id} href={`/customers/${customer.id}`}>
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-xs font-medium transition-colors cursor-pointer">
                                <Users className="h-3 w-3" />
                                {customer.name}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                      {projectRelations[project.id]?.lineGroups.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {projectRelations[project.id].lineGroups.map(lineGroup => (
                            <Link key={lineGroup.id} href={`/line-groups/${lineGroup.id}`}>
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded-md text-xs font-medium transition-colors cursor-pointer">
                                <MessageSquare className="h-3 w-3" />
                                {lineGroup.name}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="hidden md:block">
                      <InlineStatusSelect 
                        value={project.status as StatusType} 
                        onChange={(status) => updateProjectStatus(project.id, status)}
                      />
                    </div>
                    <div className="md:hidden">
                      <StatusBadge status={project.status} size="sm" />
                    </div>
                    <div className="hidden md:flex gap-2">
                      <Link href={`/projects/${project.id}`}>
                        <ActionButton
                          icon={<ArrowRight className="h-4 w-4" />}
                          label="詳細"
                          variant="ghost"
                          size="sm"
                          tooltip="プロジェクト詳細を表示"
                        />
                      </Link>
                      <Link href={`/projects/${project.id}/edit`}>
                        <ActionButton
                          icon={<Edit className="h-4 w-4" />}
                          label="編集"
                          variant="outline"
                          size="sm"
                          tooltip="プロジェクトを編集"
                        />
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}