'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LineGroup, Project, Task, Customer } from '@/lib/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge, StatusType } from '@/components/ui/status-badge'
import { PriorityIndicator } from '@/components/ui/priority-indicator'
import { ActionButton } from '@/components/ui/action-button'
import { 
  ArrowLeft, MessageSquare, FolderOpen, CheckSquare, Users, Calendar, Plus
} from 'lucide-react'
import Link from 'next/link'

export default function LineGroupDetailPage() {
  const params = useParams()
  const lineGroupId = params.id as string
  const supabase = createClient()
  
  const [lineGroup, setLineGroup] = useState<LineGroup | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineGroupId])

  const fetchData = async () => {
    try {
      // LINEグループ情報取得
      const { data: lineGroupData, error: lineGroupError } = await supabase
        .from('line_groups')
        .select('*')
        .eq('id', lineGroupId)
        .single()

      if (lineGroupError) throw lineGroupError
      setLineGroup(lineGroupData)

      // 関連プロジェクト取得
      const { data: projectRelations } = await supabase
        .from('project_line_groups')
        .select('project_id')
        .eq('line_group_id', lineGroupId)

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
          .order('deadline', { ascending: true })

        setTasks(tasksData || [])

        // プロジェクトに関連する顧客取得
        const { data: customerRelations } = await supabase
          .from('project_customers')
          .select('customer_id')
          .in('project_id', projectIds)

        if (customerRelations && customerRelations.length > 0) {
          const customerIds = [...new Set(customerRelations.map((r: { customer_id: string }) => r.customer_id))]
          
          const { data: customersData } = await supabase
            .from('customers')
            .select('*')
            .in('id', customerIds)
            .order('name')

          setCustomers(customersData || [])
        }
      }

    } catch (error) {
      console.error('データ取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <MessageSquare className="h-8 w-8 animate-pulse text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!lineGroup) {
    return (
      <div className="container mx-auto p-6">
        <p>LINEグループが見つかりません</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <Link href="/line-groups">
          <ActionButton
            icon={<ArrowLeft className="h-4 w-4" />}
            label="LINEグループ一覧へ"
            variant="ghost"
            size="sm"
          />
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-green-600" />
          {lineGroup.name}
        </h1>
        <p className="text-muted-foreground">
          作成日: {new Date(lineGroup.created_at).toLocaleDateString('ja-JP')}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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

        {/* 関連顧客 */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              関連顧客 ({customers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {customers.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">関連顧客がありません</p>
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

        {/* 関連タスク */}
        <Card className="shadow-lg lg:col-span-2">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-blue-600" />
                関連タスク ({tasks.length})
              </CardTitle>
              <Link href={`/tasks/new?linegroup=${lineGroupId}`}>
                <ActionButton
                  icon={<Plus className="h-4 w-4" />}
                  label="タスク追加"
                  size="sm"
                  tooltip="このLINEグループに関連するタスクを追加"
                  variant="default"
                />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-3 md:grid-cols-2">
              {tasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-4 col-span-full">
                  関連タスクがありません
                </p>
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
      </div>
    </div>
  )
}