export type TicketStatus = 'todo' | 'in-progress' | 'done'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

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
  project?: string
  source?: string
  description?: string
  acceptanceCriteria?: string[]
  body: string
  order?: number
}

export interface TicketCreate {
  title: string
  status?: TicketStatus
  priority?: TicketPriority
  tags?: string[]
  dueDate?: string
  project?: string
  source?: string
  description?: string
  acceptanceCriteria?: string[]
}

export interface TicketUpdate {
  title?: string
  status?: TicketStatus
  priority?: TicketPriority
  tags?: string[]
  dueDate?: string | null
  project?: string | null
  source?: string
  description?: string
  acceptanceCriteria?: string[]
  body?: string
  order?: number
}

export type ViewType = 'inbox' | 'today' | 'backlog' | 'done' | 'all'
export type DisplayMode = 'list' | 'board'
export type SortOption = 'manual' | 'priority' | 'updated' | 'created' | 'title' | 'dueDate'
