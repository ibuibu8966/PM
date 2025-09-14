import { createClient } from '@/lib/supabase/client'
// Note: Task and Project types are not used but may be needed for type checking in the future
import { differenceInDays, format } from 'date-fns'
import { ja } from 'date-fns/locale'

export class NotificationService {
  private supabase = createClient()

  // タスクの期限チェック
  async checkTaskDeadlines() {
    try {
      const { data: tasks, error } = await this.supabase
        .from('tasks')
        .select('*')
        .not('status', 'eq', 'completed')
        .not('deadline', 'is', null)

      if (error) throw error

      const now = new Date()
      const notifications = []

      for (const task of tasks || []) {
        const deadline = new Date(task.deadline!)
        const daysUntilDeadline = differenceInDays(deadline, now)

        // 期限切れ
        if (daysUntilDeadline < 0) {
          notifications.push({
            title: '期限切れのタスク',
            message: `"${task.title}" の期限が${Math.abs(daysUntilDeadline)}日前に切れています`,
            type: 'task_overdue',
            related_task_id: task.id
          })
        }
        // 期限が近づいている（3日以内）
        else if (daysUntilDeadline <= 3 && daysUntilDeadline >= 0) {
          notifications.push({
            title: '期限が近づいています',
            message: `"${task.title}" の期限は${format(deadline, 'MM月dd日', { locale: ja })}です`,
            type: 'task_deadline',
            related_task_id: task.id
          })
        }
      }

      // 通知を保存
      if (notifications.length > 0) {
        const { error: insertError } = await this.supabase
          .from('notifications')
          .insert(notifications)

        if (insertError) throw insertError
      }

      return notifications
    } catch (error) {
      console.error('期限チェックエラー:', error)
      return []
    }
  }

  // タスクステータス変更通知
  async notifyStatusChange(
    taskId: string,
    taskTitle: string,
    oldStatus: string,
    newStatus: string
  ) {
    try {
      const statusLabels: Record<string, string> = {
        'not_started': '未着手',
        'waiting_confirmation': '確認待ち',
        'in_progress': '進行中',
        'completed': '完了'
      }

      const notification = {
        title: 'ステータスが変更されました',
        message: `"${taskTitle}" のステータスが ${statusLabels[oldStatus]} から ${statusLabels[newStatus]} に変更されました`,
        type: 'status_changed' as const,
        related_task_id: taskId
      }

      const { error } = await this.supabase
        .from('notifications')
        .insert(notification)

      if (error) throw error

      return notification
    } catch (error) {
      console.error('ステータス変更通知エラー:', error)
      return null
    }
  }

  // 優先度変更通知
  async notifyPriorityChange(
    taskId: string,
    taskTitle: string,
    oldPriority: number,
    newPriority: number
  ) {
    try {
      const notification = {
        title: '優先度が変更されました',
        message: `"${taskTitle}" の優先度が ${oldPriority} から ${newPriority} に変更されました`,
        type: 'priority_changed' as const,
        related_task_id: taskId
      }

      const { error } = await this.supabase
        .from('notifications')
        .insert(notification)

      if (error) throw error

      return notification
    } catch (error) {
      console.error('優先度変更通知エラー:', error)
      return null
    }
  }

  // コメント追加通知
  async notifyCommentAdded(
    entityType: 'task' | 'project',
    entityId: string,
    entityTitle: string,
    authorName: string
  ) {
    try {
      const notification = {
        title: '新しいコメント',
        message: `${authorName}さんが"${entityTitle}"にコメントを追加しました`,
        type: 'comment_added' as const,
        ...(entityType === 'task' 
          ? { related_task_id: entityId }
          : { related_project_id: entityId }
        )
      }

      const { error } = await this.supabase
        .from('notifications')
        .insert(notification)

      if (error) throw error

      return notification
    } catch (error) {
      console.error('コメント追加通知エラー:', error)
      return null
    }
  }

  // タスク割り当て通知
  async notifyTaskAssigned(
    taskId: string,
    taskTitle: string,
    assigneeName: string
  ) {
    try {
      const notification = {
        title: 'タスクが割り当てられました',
        message: `"${taskTitle}" が${assigneeName}さんに割り当てられました`,
        type: 'task_assigned' as const,
        related_task_id: taskId,
        recipient: assigneeName
      }

      const { error } = await this.supabase
        .from('notifications')
        .insert(notification)

      if (error) throw error

      return notification
    } catch (error) {
      console.error('タスク割り当て通知エラー:', error)
      return null
    }
  }

  // 一般通知
  async sendGeneralNotification(
    title: string,
    message: string,
    projectId?: string,
    taskId?: string
  ) {
    try {
      const notification = {
        title,
        message,
        type: 'general' as const,
        ...(projectId && { related_project_id: projectId }),
        ...(taskId && { related_task_id: taskId })
      }

      const { error } = await this.supabase
        .from('notifications')
        .insert(notification)

      if (error) throw error

      return notification
    } catch (error) {
      console.error('一般通知エラー:', error)
      return null
    }
  }
}

export const notificationService = new NotificationService()