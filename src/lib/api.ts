import type { Ticket, TicketCreate, TicketUpdate } from '@/types/ticket'

const API_BASE = '/api'

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }
  return response.json()
}

export const api = {
  async getTickets(): Promise<Ticket[]> {
    const response = await fetch(`${API_BASE}/tickets`)
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

  async getTags(): Promise<string[]> {
    const response = await fetch(`${API_BASE}/tags`)
    return handleResponse<string[]>(response)
  },

  async getProjects(): Promise<string[]> {
    const response = await fetch(`${API_BASE}/projects`)
    return handleResponse<string[]>(response)
  },
}
