export type Customer = {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export type LineGroup = {
  id: string
  name: string
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

export type Memo = {
  id: string
  customer_id?: string
  line_group_id?: string
  project_id?: string
  task_id?: string
  proposal_id?: string
  title?: string
  content: string
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