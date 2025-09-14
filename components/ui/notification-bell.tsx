'use client'

import { useEffect, useState } from 'react'
import { Bell, Check, Clock, AlertCircle, MessageSquare, TrendingUp, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createClient } from '@/lib/supabase/client'
import { Notification } from '@/lib/types/database'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchNotifications()
    
    // リアルタイム通知の設定
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        const newNotification = payload.new as Notification
        setNotifications(prev => [newNotification, ...prev])
        setUnreadCount(prev => prev + 1)
        
        // ブラウザ通知（権限がある場合）
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(newNotification.title, {
            body: newNotification.message,
            icon: '/icon-192x192.png'
          })
        }
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
        .limit(20)

      if (error) throw error
      
      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.is_read).length || 0)
    } catch (error) {
      console.error('通知取得エラー:', error)
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
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
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

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('全既読更新エラー:', error)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }

    // 関連ページへ遷移
    if (notification.related_task_id) {
      router.push(`/tasks/${notification.related_task_id}`)
    } else if (notification.related_project_id) {
      router.push(`/projects/${notification.related_project_id}`)
    }
    
    setIsOpen(false)
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
        return 'text-red-500'
      case 'task_deadline':
        return 'text-amber-500'
      case 'priority_changed':
        return 'text-orange-500'
      case 'comment_added':
        return 'text-blue-500'
      default:
        return 'text-gray-500'
    }
  }

  // ブラウザ通知の権限リクエスト
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  useEffect(() => {
    requestNotificationPermission()
  }, [])

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 px-0">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <h3 className="font-semibold text-sm">通知</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={markAllAsRead}
            >
              すべて既読にする
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              通知はありません
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type)
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 p-3 cursor-pointer",
                    !notification.is_read && "bg-muted/50"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", getNotificationColor(notification.type))} />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: ja
                      })}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="w-2 h-2 bg-primary rounded-full mt-1.5" />
                  )}
                </DropdownMenuItem>
              )
            })
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-center text-sm text-muted-foreground hover:text-foreground"
              onClick={() => {
                router.push('/notifications')
                setIsOpen(false)
              }}
            >
              すべての通知を見る
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}