export interface User {
  id: number
  name: string
  email: string
  email_verified: boolean
  avatar_color: string
}

export interface AuthResponse {
  token: string
  refresh_token: string
  user: User
}

export interface MessageResponse {
  message: string
}

export interface ApiError {
  [field: string]: string[]
}

export interface Project {
  id: number
  name: string
  description: string
  creator_id: number
  member_count: number
  created_at: string
}

export interface Column {
  id: number
  name: string
  position: number
  tasks: Task[]
}

export interface Task {
  id: number
  name: string
  description: string
  priority: 'low' | 'medium' | 'high'
  position: number
  column_id: number
  creator_id: number
  is_ai_generated: boolean
  version: number
  assignees: { id: number; name: string; avatar_color: string }[]
  created_at: string
}

export interface Message {
  id: number
  sender: { id: number; name: string; avatar_color: string }
  text: string
  attachments: Attachment[]
  created_at: string
}

export const EXTRACTION_MARKER = '──────── Tasks extracted ────────'

export interface BoardEvent {
  type: 'board_event'
  event: 'task:created' | 'task:updated' | 'task:moved' | 'task:deleted' | 'column:created' | 'column:renamed' | 'column:deleted'
  payload: Record<string, unknown>
}

export interface Attachment {
  id: number
  url: string
  name: string
  size: number
  type: string
}

export interface ProjectMember {
  id: number
  name: string
  avatar_color: string
}

export interface Suggestion {
  name: string
  description: string
  priority: 'high' | 'medium' | 'low'
}
