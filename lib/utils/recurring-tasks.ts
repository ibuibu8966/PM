import { createClient } from '@/lib/supabase/client'
import { RecurringTask } from '@/lib/types/database'

export async function generateTasksFromRecurring() {
  const supabase = createClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  try {
    // アクティブな繰り返しタスクを取得
    const { data: recurringTasks, error: fetchError } = await supabase
      .from('recurring_tasks')
      .select('*')
      .eq('is_active', true)
      .or(`next_generation_at.is.null,next_generation_at.lte.${todayStr}`)

    if (fetchError) throw fetchError
    if (!recurringTasks || recurringTasks.length === 0) return

    for (const recurringTask of recurringTasks) {
      // タスクを生成すべきか判定
      if (!shouldGenerateTask(recurringTask, today)) continue

      // 既に今日のタスクが生成されているか確認
      const { data: existingTasks } = await supabase
        .from('generated_tasks')
        .select('*, tasks(*)')
        .eq('recurring_task_id', recurringTask.id)
        .gte('generated_at', todayStr)

      if (existingTasks && existingTasks.length > 0) continue

      // 新しいタスクを生成
      const deadline = new Date(today)
      deadline.setHours(23, 59, 59, 999)

      const { data: newTask, error: insertError } = await supabase
        .from('tasks')
        .insert({
          title: recurringTask.title,
          description: recurringTask.description,
          project_id: recurringTask.project_id,
          priority: recurringTask.priority,
          status: 'not_started',
          deadline: deadline.toISOString(),
        })
        .select()
        .single()

      if (insertError) {
        console.error('タスク生成エラー:', insertError)
        continue
      }

      // 生成記録を保存
      await supabase
        .from('generated_tasks')
        .insert({
          recurring_task_id: recurringTask.id,
          task_id: newTask.id,
        })

      // 次回生成日を更新
      const nextDate = calculateNextGenerationDate(recurringTask, today)
      await supabase
        .from('recurring_tasks')
        .update({
          last_generated_at: todayStr,
          next_generation_at: nextDate.toISOString().split('T')[0],
        })
        .eq('id', recurringTask.id)
    }
  } catch (error) {
    console.error('繰り返しタスク生成エラー:', error)
  }
}

function shouldGenerateTask(task: RecurringTask, today: Date): boolean {
  // 次回生成日が設定されていない、または今日以前の場合は生成
  if (!task.next_generation_at) return true

  const nextGen = new Date(task.next_generation_at)
  if (nextGen > today) return false

  switch (task.recurrence_type) {
    case 'daily':
      return true

    case 'weekly':
      // 今日の曜日が設定された曜日に含まれているか
      const todayWeekday = today.getDay()
      return task.week_days?.includes(todayWeekday) || false

    case 'monthly':
      // 今日の日付が設定された日付と一致するか
      const todayDate = today.getDate()
      return todayDate === task.month_day

    default:
      return false
  }
}

function calculateNextGenerationDate(task: RecurringTask, fromDate: Date): Date {
  const nextDate = new Date(fromDate)

  switch (task.recurrence_type) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + task.recurrence_interval)
      break

    case 'weekly':
      // 次の設定された曜日を探す
      if (task.week_days && task.week_days.length > 0) {
        const sortedDays = [...task.week_days].sort((a, b) => a - b)
        const currentDay = fromDate.getDay()

        // 今週の残りの曜日から探す
        const nextDay = sortedDays.find(d => d > currentDay)

        if (nextDay !== undefined) {
          // 今週内に次の曜日がある
          nextDate.setDate(nextDate.getDate() + (nextDay - currentDay))
        } else {
          // 来週の最初の曜日
          const daysUntilNext = 7 - currentDay + sortedDays[0]
          nextDate.setDate(nextDate.getDate() + daysUntilNext)
        }
      } else {
        // 曜日が設定されていない場合は7日後
        nextDate.setDate(nextDate.getDate() + 7)
      }
      break

    case 'monthly':
      // 次月の同じ日
      nextDate.setMonth(nextDate.getMonth() + task.recurrence_interval)

      // 月末調整（例：31日設定で2月の場合）
      if (task.month_day && task.month_day > 28) {
        const lastDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()
        if (task.month_day > lastDay) {
          nextDate.setDate(lastDay)
        } else {
          nextDate.setDate(task.month_day)
        }
      }
      break
  }

  return nextDate
}