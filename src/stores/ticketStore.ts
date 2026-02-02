import { create } from 'zustand'
import type { Ticket, TicketCreate, TicketUpdate, ViewType, DisplayMode, SortOption } from '@/types/ticket'
import { api } from '@/lib/api'

interface TicketState {
  tickets: Ticket[]
  tags: string[]
  projects: string[]
  selectedTicketId: string | null
  activeView: ViewType
  displayMode: DisplayMode
  selectedTags: string[]
  selectedProject: string | null // null = all, "" = loose tickets (no project)
  searchQuery: string
  sortBy: SortOption
  isLoading: boolean
  error: string | null

  // Actions
  fetchTickets: () => Promise<void>
  fetchTags: () => Promise<void>
  fetchProjects: () => Promise<void>
  createTicket: (data: TicketCreate) => Promise<Ticket>
  updateTicket: (id: string, data: TicketUpdate) => Promise<void>
  deleteTicket: (id: string) => Promise<void>
  selectTicket: (id: string | null) => void
  setActiveView: (view: ViewType) => void
  setDisplayMode: (mode: DisplayMode) => void
  setSearchQuery: (query: string) => void
  setSortBy: (sort: SortOption) => void
  toggleTag: (tag: string) => void
  clearSelectedTags: () => void
  setSelectedProject: (project: string | null) => void
  reorderTicket: (ticketId: string, newOrder: number) => Promise<void>

  // Computed
  getFilteredTickets: () => Ticket[]
}

export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: [],
  tags: [],
  projects: [],
  selectedTicketId: null,
  activeView: 'all',
  displayMode: 'list',
  selectedTags: [],
  selectedProject: null,
  searchQuery: '',
  sortBy: 'manual',
  isLoading: false,
  error: null,

  fetchTickets: async () => {
    set({ isLoading: true, error: null })
    try {
      const tickets = await api.getTickets()
      set({ tickets, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  fetchTags: async () => {
    try {
      const tags = await api.getTags()
      set({ tags })
    } catch (error) {
      console.error('Failed to fetch tags:', error)
    }
  },

  fetchProjects: async () => {
    try {
      const projects = await api.getProjects()
      set({ projects })
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    }
  },

  createTicket: async (data: TicketCreate) => {
    const ticket = await api.createTicket(data)
    set((state) => ({ tickets: [ticket, ...state.tickets] }))
    return ticket
  },

  updateTicket: async (id: string, data: TicketUpdate) => {
    // Optimistic update
    const previousTickets = get().tickets
    // Convert null values to undefined for the optimistic update to match Ticket type
    const optimisticData = {
      ...data,
      dueDate: data.dueDate === null ? undefined : data.dueDate,
      project: data.project === null ? undefined : data.project,
    }
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === id ? { ...t, ...optimisticData, updated: new Date().toISOString().split('T')[0] } : t
      ),
    }))

    try {
      const updated = await api.updateTicket(id, data)
      set((state) => ({
        tickets: state.tickets.map((t) => (t.id === id ? updated : t)),
      }))
    } catch (error) {
      // Rollback on error
      set({ tickets: previousTickets })
      throw error
    }
  },

  deleteTicket: async (id: string) => {
    const previousTickets = get().tickets
    set((state) => ({
      tickets: state.tickets.filter((t) => t.id !== id),
      selectedTicketId: state.selectedTicketId === id ? null : state.selectedTicketId,
    }))

    try {
      await api.deleteTicket(id)
    } catch (error) {
      set({ tickets: previousTickets })
      throw error
    }
  },

  selectTicket: (id: string | null) => {
    set({ selectedTicketId: id })
  },

  setActiveView: (view: ViewType) => {
    set({ activeView: view, selectedTicketId: null })
  },

  setDisplayMode: (mode: DisplayMode) => {
    set({ displayMode: mode })
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query })
  },

  setSortBy: (sort: SortOption) => {
    set({ sortBy: sort })
  },

  toggleTag: (tag: string) => {
    set((state) => ({
      selectedTags: state.selectedTags.includes(tag)
        ? state.selectedTags.filter((t) => t !== tag)
        : [...state.selectedTags, tag],
    }))
  },

  clearSelectedTags: () => {
    set({ selectedTags: [] })
  },

  setSelectedProject: (project: string | null) => {
    set({ selectedProject: project })
  },

  reorderTicket: async (ticketId: string, newOrder: number) => {
    // Optimistic update
    const previousTickets = get().tickets
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId ? { ...t, order: newOrder } : t
      ),
    }))

    try {
      await api.updateTicket(ticketId, { order: newOrder })
    } catch (error) {
      // Rollback on error
      set({ tickets: previousTickets })
      throw error
    }
  },

  getFilteredTickets: () => {
    const { tickets, activeView, selectedTags, selectedProject, searchQuery, sortBy } = get()

    let filtered = tickets

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((t) =>
        t.title.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Filter by view
    switch (activeView) {
      case 'inbox':
        filtered = filtered.filter((t) => !t.project && t.status !== 'done')
        break
      case 'today':
        filtered = filtered.filter((t) => t.status === 'in-progress')
        break
      case 'backlog':
        filtered = filtered.filter((t) => t.status === 'todo')
        break
      case 'done':
        filtered = filtered.filter((t) => t.status === 'done')
        break
      case 'all':
      default:
        break
    }

    // Filter by project
    if (selectedProject !== null) {
      if (selectedProject === '') {
        // Show tickets without a project (loose tickets)
        filtered = filtered.filter((t) => !t.project)
      } else {
        // Show tickets with the selected project
        filtered = filtered.filter((t) => t.project === selectedProject)
      }
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter((t) => selectedTags.some((tag) => t.tags.includes(tag)))
    }

    // Sort
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'manual':
          // Sort by order field, tickets without order go to end
          const aOrder = a.order ?? Number.MAX_SAFE_INTEGER
          const bOrder = b.order ?? Number.MAX_SAFE_INTEGER
          if (aOrder !== bOrder) return aOrder - bOrder
          // Fallback to created date for tickets without order
          return new Date(a.created).getTime() - new Date(b.created).getTime()
        case 'priority':
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
          if (priorityDiff !== 0) return priorityDiff
          return new Date(b.updated).getTime() - new Date(a.updated).getTime()
        case 'updated':
          return new Date(b.updated).getTime() - new Date(a.updated).getTime()
        case 'created':
          return new Date(b.created).getTime() - new Date(a.created).getTime()
        case 'title':
          return a.title.localeCompare(b.title)
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        default:
          return 0
      }
    })
  },
}))
