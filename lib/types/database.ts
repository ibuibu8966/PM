export type Customer = {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export type LineGroup = {
  id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Project = {
  id: string
  name: string
  description?: string
  priority: number
  status: 'not_started' | 'waiting_confirmation' | 'in_progress' | 'completed'
  deadline?: string
  created_at: string
  updated_at: string
}

export type Task = {
  id: string
  project_id: string
  title: string
  description?: string
  priority: number
  status: 'not_started' | 'waiting_confirmation' | 'in_progress' | 'completed'
  deadline?: string
  notification_time: string
  assignee_id?: string
  created_at: string
  updated_at: string
}

export type Proposal = {
  id: string
  task_id?: string
  project_id?: string
  title: string
  content: string
  reason?: string
  is_adopted: boolean
  proposal_order: number
  created_at: string
  updated_at: string
}

export type ProjectCustomer = {
  id: string
  project_id: string
  customer_id: string
  created_at: string
}

export type ProjectLineGroup = {
  id: string
  project_id: string
  line_group_id: string
  created_at: string
}

export type PlaudSummary = {
  id: string
  customer_id: string
  title: string
  summary_date: string
  content: string
  created_at: string
  updated_at: string
}

export type UnregisteredTask = {
  id: string
  line_group_name: string
  content: string
  sender_name?: string
  created_at: string
  updated_at: string
}

export type Memo = {
  id: string
  content: string
  project_id?: string
  task_id?: string
  created_at: string
  updated_at: string
}

export type Attachment = {
  id: string
  filename: string
  file_url: string
  file_size: number
  mime_type: string
  project_id?: string
  task_id?: string
  uploaded_by?: string
  created_at: string
}

export type Comment = {
  id: string
  content: string
  project_id?: string
  task_id?: string
  author_name: string
  created_at: string
  updated_at: string
}

export type Notification = {
  id: string
  title: string
  message: string
  type: 'task_deadline' | 'task_overdue' | 'task_assigned' | 'comment_added' | 'status_changed' | 'priority_changed' | 'general'
  is_read: boolean
  related_project_id?: string
  related_task_id?: string
  recipient?: string
  created_at: string
  read_at?: string
}

export type NotificationSettings = {
  id: string
  user_id?: string
  task_deadline_enabled: boolean
  task_overdue_enabled: boolean
  task_assigned_enabled: boolean
  comment_added_enabled: boolean
  status_changed_enabled: boolean
  priority_changed_enabled: boolean
  email_notifications: boolean
  push_notifications: boolean
  created_at: string
  updated_at: string
}

export type RecurringTask = {
  id: string
  title: string
  description?: string
  project_id?: string
  priority: number
  recurrence_type: 'daily' | 'weekly' | 'monthly'
  recurrence_interval: number
  week_days?: number[]
  month_day?: number
  is_active: boolean
  last_generated_at?: string
  next_generation_at?: string
  created_at: string
  updated_at: string
}

export type GeneratedTask = {
  id: string
  recurring_task_id: string
  task_id: string
  generated_at: string
}