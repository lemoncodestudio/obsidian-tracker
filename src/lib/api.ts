import type { Ticket, TicketCreate, TicketUpdate } from '@/types/ticket'
import type { Todo, TodoUpdate, TodoCreate } from '@/types/todo'

const API_BASE = '/api'

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }
  return response.json()
}

export const api = {
  async getBacklogs(): Promise<string[]> {
    const response = await fetch(`${API_BASE}/tickets/backlogs`)
    return handleResponse<string[]>(response)
  },

  async getTickets(backlog?: string): Promise<Ticket[]> {
    const url = backlog
      ? `${API_BASE}/tickets?backlog=${encodeURIComponent(backlog)}`
      : `${API_BASE}/tickets`
    const response = await fetch(url)
    return handleResponse<Ticket[]>(response)
  },

  async getTicket(id: string): Promise<Ticket> {
    const response = await fetch(`${API_BASE}/tickets/${encodeURIComponent(id)}`)
    return handleResponse<Ticket>(response)
  },

  async createTicket(data: TicketCreate): Promise<Ticket> {
    const response = await fetch(`${API_BASE}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return handleResponse<Ticket>(response)
  },

  async updateTicket(id: string, data: TicketUpdate): Promise<Ticket> {
    const response = await fetch(`${API_BASE}/tickets/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return handleResponse<Ticket>(response)
  },

  async deleteTicket(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/tickets/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }
  },

  async getTags(backlog?: string): Promise<string[]> {
    const url = backlog
      ? `${API_BASE}/tags?backlog=${encodeURIComponent(backlog)}`
      : `${API_BASE}/tags`
    const response = await fetch(url)
    return handleResponse<string[]>(response)
  },

  async getLabels(backlog?: string): Promise<string[]> {
    const url = backlog
      ? `${API_BASE}/labels?backlog=${encodeURIComponent(backlog)}`
      : `${API_BASE}/labels`
    const response = await fetch(url)
    return handleResponse<string[]>(response)
  },

  // Todo API
  async getTodos(): Promise<Todo[]> {
    const response = await fetch(`${API_BASE}/todos`)
    return handleResponse<Todo[]>(response)
  },

  async createTodo(data: TodoCreate): Promise<Todo> {
    const response = await fetch(`${API_BASE}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return handleResponse<Todo>(response)
  },

  async updateTodo(id: string, data: TodoUpdate): Promise<Todo> {
    const response = await fetch(`${API_BASE}/todos/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return handleResponse<Todo>(response)
  },

  async getTodoProjects(): Promise<string[]> {
    const response = await fetch(`${API_BASE}/todos/projects`)
    return handleResponse<string[]>(response)
  },

  async getTodoProjectPaths(): Promise<string[]> {
    const response = await fetch(`${API_BASE}/todos/project-paths`)
    return handleResponse<string[]>(response)
  },
}
