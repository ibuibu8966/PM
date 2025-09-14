'use client'

import { useEffect, useState } from 'react'
import { Bell, Check, Clock, AlertCircle, MessageSquare, TrendingUp, Calendar, Filter, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { createClient } from '@/lib/supabase/client'
import { Notification } from '@/lib/types/database'
import { formatDistanceToNow, format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | Notification['type']>('all')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchNotifications()

    // リアルタイム更新
    const channel = supabase
      .channel('notifications-page')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications'
      }, () => {
        fetchNotifications()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error('通知取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      )
    } catch (error) {
      console.error('既読更新エラー:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
      
      if (unreadIds.length === 0) return

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds)

      if (error) throw error

      setNotifications(prev => prev.map(n => ({ 
        ...n, 
        is_read: true,
        read_at: new Date().toISOString()
      })))
    } catch (error) {
      console.error('全既読更新エラー:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (error) {
      console.error('通知削除エラー:', error)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }

    if (notification.related_task_id) {
      router.push(`/tasks/${notification.related_task_id}`)
    } else if (notification.related_project_id) {
      router.push(`/projects/${notification.related_project_id}`)
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'task_deadline':
      case 'task_overdue':
        return Clock
      case 'comment_added':
        return MessageSquare
      case 'status_changed':
      case 'priority_changed':
        return TrendingUp
      case 'task_assigned':
        return Calendar
      default:
        return AlertCircle
    }
  }

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'task_overdue':
        return 'text-red-500 bg-red-50 dark:bg-red-950'
      case 'task_deadline':
        return 'text-amber-500 bg-amber-50 dark:bg-amber-950'
      case 'priority_changed':
        return 'text-orange-500 bg-orange-50 dark:bg-orange-950'
      case 'comment_added':
        return 'text-blue-500 bg-blue-50 dark:bg-blue-950'
      default:
        return 'text-gray-500 bg-gray-50 dark:bg-gray-950'
    }
  }

  const getTypeLabel = (type: Notification['type']) => {
    switch (type) {
      case 'task_deadline': return '期限近づく'
      case 'task_overdue': return '期限切れ'
      case 'task_assigned': return 'タスク割り当て'
      case 'comment_added': return 'コメント'
      case 'status_changed': return 'ステータス変更'
      case 'priority_changed': return '優先度変更'
      default: return '一般'
    }
  }

  // フィルタリング
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread' && n.is_read) return false
    if (filter === 'read' && !n.is_read) return false
    if (typeFilter !== 'all' && n.type !== typeFilter) return false
    return true
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

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
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bell className="h-8 w-8" />
            通知
          </h1>
          {unreadCount > 0 && (
            <Button
              onClick={markAllAsRead}
              variant="outline"
              size="sm"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              すべて既読にする
            </Button>
          )}
        </div>
        <p className="text-muted-foreground">
          {unreadCount > 0 ? `${unreadCount}件の未読通知があります` : '未読の通知はありません'}
        </p>
      </div>

      {/* フィルター */}
      <div className="flex gap-4 mb-6">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="flex-1">
          <TabsList>
            <TabsTrigger value="all">すべて ({notifications.length})</TabsTrigger>
            <TabsTrigger value="unread">未読 ({unreadCount})</TabsTrigger>
            <TabsTrigger value="read">既読 ({notifications.length - unreadCount})</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="通知タイプ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべてのタイプ</SelectItem>
            <SelectItem value="task_deadline">期限近づく</SelectItem>
            <SelectItem value="task_overdue">期限切れ</SelectItem>
            <SelectItem value="task_assigned">タスク割り当て</SelectItem>
            <SelectItem value="comment_added">コメント</SelectItem>
            <SelectItem value="status_changed">ステータス変更</SelectItem>
            <SelectItem value="priority_changed">優先度変更</SelectItem>
            <SelectItem value="general">一般</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 通知リスト */}
      {filteredNotifications.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">通知がありません</p>
          <p className="text-sm text-muted-foreground">
            {filter === 'unread' ? '未読の通知はありません' : 
             filter === 'read' ? '既読の通知はありません' :
             '通知が発生するとここに表示されます'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type)
            return (
              <Card
                key={notification.id}
                className={cn(
                  "p-4 cursor-pointer transition-all hover:shadow-md",
                  !notification.is_read && "border-primary bg-muted/30"
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "p-2 rounded-lg flex-shrink-0",
                    getNotificationColor(notification.type)
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-medium text-base">
                        {notification.title}
                      </h3>
                      <Badge variant="outline" className="ml-2 flex-shrink-0">
                        {getTypeLabel(notification.type)}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: ja
                        })}
                      </p>
                      
                      <div className="flex items-center gap-2">
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              markAsRead(notification.id)
                            }}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            既読にする
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteNotification(notification.id)
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          削除
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}