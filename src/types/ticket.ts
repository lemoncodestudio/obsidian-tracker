export type TicketStatus = 'todo' | 'in-progress' | 'done'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface TicketComment {
  id: string
  text: string
  timestamp: string
  author?: string
}

export interface Ticket {
  id: string
  filename: string
  title: string
  status: TicketStatus
  priority: TicketPriority
  tags: string[]
  created: string
  updated: string
  dueDate?: string
  label?: string
  source?: string
  description?: string
  acceptanceCriteria?: string[]
  comments?: TicketComment[]
  body: string
  order?: number
  backlog: string  // vault project the ticket belongs to
}

export interface TicketCreate {
  title: string
  status?: TicketStatus
  priority?: TicketPriority
  tags?: string[]
  dueDate?: string
  label?: string
  source?: string
  description?: string
  acceptanceCriteria?: string[]
  backlog?: string  // added by store from selectedBacklog
}

export interface TicketUpdate {
  title?: string
  status?: TicketStatus
  priority?: TicketPriority
  tags?: string[]
  dueDate?: string | null
  label?: string | null
  source?: string
  description?: string
  acceptanceCriteria?: string[]
  comments?: TicketComment[]
  body?: string
  order?: number
}

export type ViewType = 'inbox' | 'today' | 'backlog' | 'done' | 'all'
export type DisplayMode = 'list' | 'board'
export type SortOption = 'manual' | 'priority' | 'updated' | 'created' | 'title' | 'dueDate'
