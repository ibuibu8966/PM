'use client'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function NotificationBell() {
  const [notificationCount, setNotificationCount] = useState(0)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchNotificationCount()

    // リアルタイム通知の設定
    const channel = supabase
      .channel('task-notifications-bell')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks'
      }, () => {
        fetchNotificationCount()
      })
      .subscribe()

    // 定期的に通知をチェック（1分ごと）
    const interval = setInterval(fetchNotificationCount, 60000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchNotificationCount = async () => {
    try {
      const now = new Date().toISOString()

      // notification_time が現在時刻以前で、statusがcompletedではないタスクをカウント
      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .lte('notification_time', now)
        .neq('status', 'completed')

      if (error) throw error

      setNotificationCount(count || 0)
    } catch (error) {
      console.error('通知数取得エラー:', error)
    }
  }

  const handleClick = () => {
    router.push('/notifications')
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="relative h-9 w-9 px-0"
      onClick={handleClick}
    >
      <Bell
        className={`h-4 w-4 ${notificationCount > 0 ? 'animate-notification-pulse' : ''}`}
      />
      {notificationCount > 0 && (
        <>
          <Badge
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center animate-notification-badge"
            variant="destructive"
          >
            {notificationCount > 9 ? '9+' : notificationCount}
          </Badge>
          {/* 背景の点滅エフェクト */}
          <span className="absolute inset-0 rounded-md animate-notification-background" />
        </>
      )}
    </Button>
  )
}
