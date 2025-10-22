'use client'

import { useEffect, useState } from 'react'
import { Bell, Check, Clock, AlertCircle, CheckSquare, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface TaskNotification {
  id: string
  title: string
  description: string | null
  priority: number
  status: string
  deadline: string | null
  notification_time: string
  project_id: string
  project?: {
    name: string
  }
}

export default function NotificationsPage() {
  const [tasks, setTasks] = useState<TaskNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<TaskNotification | null>(null)
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false)
  const [newNotificationTime, setNewNotificationTime] = useState('')
  const [processing, setProcessing] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchNotifications()

    // リアルタイム更新
    const channel = supabase
      .channel('task-notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks'
      }, () => {
        fetchNotifications()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchNotifications = async () => {
    try {
      const now = new Date().toISOString()

      // notification_time が現在時刻以前で、statusがcompletedではないタスクを取得
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects(name)
        `)
        .lte('notification_time', now)
        .neq('status', 'completed')
        .order('notification_time', { ascending: true })

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('通知取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    setProcessing(true)
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', taskId)

      if (error) throw error

      // タスクリストから削除
      setTasks(prev => prev.filter(t => t.id !== taskId))
      setSelectedTask(null)
    } catch (error) {
      console.error('完了エラー:', error)
      alert('タスクの完了処理に失敗しました')
    } finally {
      setProcessing(false)
    }
  }

  const handleReschedule = (task: TaskNotification) => {
    setSelectedTask(task)
    // 初期値は現在時刻
    setNewNotificationTime(new Date().toISOString().slice(0, 16))
    setShowRescheduleDialog(true)
  }

  const handleRescheduleSubmit = async () => {
    if (!selectedTask || !newNotificationTime) return

    // 未来の日時かチェック
    if (new Date(newNotificationTime) <= new Date()) {
      alert('未来の日時を指定してください')
      return
    }

    setProcessing(true)
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ notification_time: newNotificationTime })
        .eq('id', selectedTask.id)

      if (error) throw error

      // タスクリストから削除
      setTasks(prev => prev.filter(t => t.id !== selectedTask.id))
      setShowRescheduleDialog(false)
      setSelectedTask(null)
      setNewNotificationTime('')
    } catch (error) {
      console.error('再通知設定エラー:', error)
      alert('再通知の設定に失敗しました')
    } finally {
      setProcessing(false)
    }
  }

  const handleTaskClick = (task: TaskNotification) => {
    router.push(`/tasks/${task.id}`)
  }

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'bg-red-500'
    if (priority >= 5) return 'bg-orange-500'
    return 'bg-gray-400'
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'not_started': return '未着手'
      case 'waiting_confirmation': return '確認待ち'
      case 'in_progress': return '進行中'
      case 'completed': return '完了'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
          <Bell className="h-8 w-8" />
          通知一覧
        </h1>
        <p className="text-muted-foreground">
          {tasks.length > 0
            ? `${tasks.length}件のタスクが通知時刻を過ぎています`
            : '通知はありません'}
        </p>
      </div>

      {tasks.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">通知はありません</p>
          <p className="text-sm text-muted-foreground">
            すべてのタスクが処理されています
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className="hover:shadow-md transition-all border-l-4"
              style={{ borderLeftColor: getPriorityColor(task.priority) }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2 flex items-center gap-2">
                      <span
                        className="cursor-pointer hover:text-primary"
                        onClick={() => handleTaskClick(task)}
                      >
                        {task.title}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        {task.project?.name || 'プロジェクト未設定'}
                      </Badge>
                      <Badge variant="secondary">
                        {getStatusLabel(task.status)}
                      </Badge>
                      <Badge className={cn(
                        "text-white",
                        task.priority >= 8 ? "bg-red-500" :
                        task.priority >= 5 ? "bg-orange-500" :
                        "bg-gray-400"
                      )}>
                        優先度: {task.priority}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {task.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {task.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    通知時刻: {new Date(task.notification_time).toLocaleString('ja-JP')}
                    <span className="text-red-500 ml-2">
                      ({formatDistanceToNow(new Date(task.notification_time), {
                        addSuffix: true,
                        locale: ja
                      })})
                    </span>
                  </div>
                  {task.deadline && (
                    <div className="flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      締切: {new Date(task.deadline).toLocaleDateString('ja-JP')}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleCompleteTask(task.id)}
                    disabled={processing}
                    className="flex-1"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    完了にする
                  </Button>
                  <Button
                    onClick={() => handleReschedule(task)}
                    disabled={processing}
                    variant="outline"
                    className="flex-1"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    再通知設定
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 再通知設定ダイアログ */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>再通知設定</DialogTitle>
            <DialogDescription>
              次の通知日時を設定してください
            </DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="mb-4">
              <p className="font-medium mb-2">{selectedTask.title}</p>
              <p className="text-sm text-muted-foreground">
                現在の通知時刻: {new Date(selectedTask.notification_time).toLocaleString('ja-JP')}
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="newNotificationTime">新しい通知日時 *</Label>
            <Input
              id="newNotificationTime"
              type="datetime-local"
              value={newNotificationTime}
              onChange={(e) => setNewNotificationTime(e.target.value)}
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              未来の日時を指定してください
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRescheduleDialog(false)}
              disabled={processing}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleRescheduleSubmit}
              disabled={processing || !newNotificationTime}
            >
              {processing ? '設定中...' : '設定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
