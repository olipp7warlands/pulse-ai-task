export type Status = 'backlog' | 'in_progress' | 'review' | 'done'
export type Priority = 'low' | 'medium' | 'high'
export type LinkType = 'doc' | 'figma' | 'github' | 'other'

export interface Project {
  id: number
  name: string
  color: string
  created_at: string
  task_count?: number
  overdue_count?: number
}

export interface Task {
  id: number
  project_id: number
  title: string
  status: Status
  priority: Priority
  due_date: string | null
  created_at: string
  updated_at: string
  link_count?: number
}

export interface Link {
  id: number
  task_id: number
  url: string
  title: string
  type: LinkType
}

export interface ActivityEntry {
  id: number
  action: string
  description: string | null
  entity_type: string | null
  entity_id: number | null
  created_at: string
}

export interface AgentResponse {
  action: string | null
  params: Record<string, unknown>
  message: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  actionTag?: string
  actionColor?: 'green' | 'blue' | 'amber'
}
