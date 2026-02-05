import { create } from 'zustand'
import type { Ticket, TicketCreate, TicketUpdate, ViewType, DisplayMode, SortOption } from '@/types/ticket'
import type { Todo, TodoViewType, TodoCreate, TodoUpdate } from '@/types/todo'
import { api } from '@/lib/api'

export type AppMode = 'tickets' | 'todos'

interface TicketState {
  // Mode
  mode: AppMode

  // Ticket state
  backlogs: string[]              // Available vault projects with backlogs
  selectedBacklog: string | null  // Currently selected backlog (null = none selected)
  tickets: Ticket[]
  tags: string[]
  labels: string[]
  selectedTicketId: string | null
  activeView: ViewType
  displayMode: DisplayMode
  selectedTags: string[]
  selectedLabel: string | null // null = all, "" = loose tickets (no label)
  searchQuery: string
  sortBy: SortOption
  hideDone: boolean
  groupByStatus: boolean
  dragDestination: { droppableId: string; index: number } | null
  isLoading: boolean
  error: string | null

  // Todo state
  todos: Todo[]
  todoProjects: string[]
  todoProjectPaths: string[]
  todoTags: string[]
  selectedTodoTags: string[]
  selectedTodoId: string | null
  activeTodoView: TodoViewType
  selectedTodoProject: string | null
  todoSearchQuery: string
  isTodosLoading: boolean
  todosError: string | null
  isCreateTodoOpen: boolean

  // Mode actions
  setMode: (mode: AppMode) => void

  // Ticket actions
  fetchBacklogs: () => Promise<void>
  setSelectedBacklog: (backlog: string | null) => void
  fetchTickets: () => Promise<void>
  fetchTags: () => Promise<void>
  fetchLabels: () => Promise<void>
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
  setSelectedLabel: (label: string | null) => void
  reorderTicket: (ticketId: string, newOrder: number) => Promise<void>
  setHideDone: (hide: boolean) => void
  setGroupByStatus: (group: boolean) => void
  setDragDestination: (dest: { droppableId: string; index: number } | null) => void

  // Todo actions
  fetchTodos: () => Promise<void>
  fetchTodoProjects: () => Promise<void>
  fetchTodoProjectPaths: () => Promise<void>
  createTodo: (data: TodoCreate) => Promise<Todo>
  updateTodo: (id: string, data: TodoUpdate) => Promise<void>
  toggleTodo: (id: string) => Promise<void>
  selectTodo: (id: string | null) => void
  setActiveTodoView: (view: TodoViewType) => void
  setTodoSearchQuery: (query: string) => void
  setSelectedTodoProject: (project: string | null) => void
  toggleTodoTag: (tag: string) => void
  clearSelectedTodoTags: () => void
  setCreateTodoOpen: (open: boolean) => void

  // Computed
  getFilteredTickets: () => Ticket[]
  getFilteredTodos: () => Todo[]
}

export const useTicketStore = create<TicketState>((set, get) => ({
  // Mode
  mode: 'tickets',

  // Ticket state
  backlogs: [],
  selectedBacklog: null,
  tickets: [],
  tags: [],
  labels: [],
  selectedTicketId: null,
  activeView: 'all',
  displayMode: 'list',
  selectedTags: [],
  selectedLabel: null,
  searchQuery: '',
  sortBy: 'manual',
  hideDone: false,
  groupByStatus: true,
  dragDestination: null,
  isLoading: false,
  error: null,

  // Todo state
  todos: [],
  todoProjects: [],
  todoProjectPaths: [],
  todoTags: [],
  selectedTodoTags: [],
  selectedTodoId: null,
  activeTodoView: 'all',
  selectedTodoProject: null,
  todoSearchQuery: '',
  isTodosLoading: false,
  todosError: null,
  isCreateTodoOpen: false,

  // Mode actions
  setMode: (mode: AppMode) => {
    set({ mode, selectedTicketId: null, selectedTodoId: null })
  },

  // Ticket actions
  fetchBacklogs: async () => {
    try {
      const backlogs = await api.getBacklogs()
      const { selectedBacklog } = get()
      // Auto-select first backlog if none selected and backlogs available
      if (backlogs.length > 0 && !selectedBacklog) {
        set({ backlogs, selectedBacklog: backlogs[0] })
      } else {
        set({ backlogs })
      }
    } catch (error) {
      console.error('Failed to fetch backlogs:', error)
    }
  },

  setSelectedBacklog: (backlog: string | null) => {
    set({
      selectedBacklog: backlog,
      // Reset ticket-specific state when switching backlogs
      selectedTicketId: null,
      selectedLabel: null,
      selectedTags: [],
      searchQuery: '',
    })
  },

  fetchTickets: async () => {
    const { selectedBacklog } = get()
    if (!selectedBacklog) {
      set({ tickets: [], isLoading: false })
      return
    }
    set({ isLoading: true, error: null })
    try {
      const tickets = await api.getTickets(selectedBacklog)
      set({ tickets, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  fetchTags: async () => {
    const { selectedBacklog } = get()
    if (!selectedBacklog) {
      set({ tags: [] })
      return
    }
    try {
      const tags = await api.getTags(selectedBacklog)
      set({ tags })
    } catch (error) {
      console.error('Failed to fetch tags:', error)
    }
  },

  fetchLabels: async () => {
    const { selectedBacklog } = get()
    if (!selectedBacklog) {
      set({ labels: [] })
      return
    }
    try {
      const labels = await api.getLabels(selectedBacklog)
      set({ labels })
    } catch (error) {
      console.error('Failed to fetch labels:', error)
    }
  },

  createTicket: async (data: TicketCreate) => {
    const { selectedBacklog } = get()
    if (!selectedBacklog) {
      throw new Error('No backlog selected')
    }
    const ticket = await api.createTicket({ ...data, backlog: selectedBacklog })
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
      label: data.label === null ? undefined : data.label,
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

  setSelectedLabel: (label: string | null) => {
    set({ selectedLabel: label })
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

  setHideDone: (hide: boolean) => {
    set({ hideDone: hide })
  },

  setGroupByStatus: (group: boolean) => {
    set({ groupByStatus: group })
  },

  setDragDestination: (dest: { droppableId: string; index: number } | null) => {
    set({ dragDestination: dest })
  },

  // Todo actions
  fetchTodos: async () => {
    set({ isTodosLoading: true, todosError: null })
    try {
      const todos = await api.getTodos()
      // Derive unique tags from todos
      const tagSet = new Set<string>()
      todos.forEach(t => t.tags?.forEach(tag => tagSet.add(tag)))
      const todoTags = Array.from(tagSet).sort()
      // Derive unique projects from todos (only those with todos)
      const projectSet = new Set<string>()
      todos.forEach(t => { if (t.project) projectSet.add(t.project) })
      const todoProjects = Array.from(projectSet).sort()
      // Derive unique project paths from todos (for create form dropdown)
      const pathSet = new Set<string>()
      todos.forEach(t => { if (t.projectPath) pathSet.add(t.projectPath) })
      const todoProjectPaths = Array.from(pathSet).sort()
      set({ todos, todoTags, todoProjects, todoProjectPaths, isTodosLoading: false })
    } catch (error) {
      set({ todosError: (error as Error).message, isTodosLoading: false })
    }
  },

  fetchTodoProjects: async () => {
    try {
      const todoProjects = await api.getTodoProjects()
      set({ todoProjects })
    } catch (error) {
      console.error('Failed to fetch todo projects:', error)
    }
  },

  fetchTodoProjectPaths: async () => {
    try {
      const todoProjectPaths = await api.getTodoProjectPaths()
      set({ todoProjectPaths })
    } catch (error) {
      console.error('Failed to fetch todo project paths:', error)
    }
  },

  createTodo: async (data: TodoCreate) => {
    const todo = await api.createTodo(data)
    set((state) => ({ todos: [todo, ...state.todos] }))
    return todo
  },

  updateTodo: async (id: string, data: TodoUpdate) => {
    const { todos } = get()
    const todo = todos.find(t => t.id === id)
    if (!todo) return

    // Optimistic update - convert null to undefined for Todo type compatibility
    const previousTodos = todos
    const optimisticData: Partial<Todo> = {}
    if (data.text !== undefined) optimisticData.text = data.text
    if (data.description !== undefined) optimisticData.description = data.description === null ? undefined : data.description
    if (data.completed !== undefined) optimisticData.completed = data.completed
    if (data.dueDate !== undefined) optimisticData.dueDate = data.dueDate === null ? undefined : data.dueDate
    if (data.priority !== undefined) optimisticData.priority = data.priority === null ? undefined : data.priority
    if (data.tags !== undefined) optimisticData.tags = data.tags

    set((state) => ({
      todos: state.todos.map((t) =>
        t.id === id ? { ...t, ...optimisticData } : t
      ),
    }))

    try {
      const updated = await api.updateTodo(id, data)
      set((state) => ({
        todos: state.todos.map((t) => (t.id === id ? updated : t)),
      }))
    } catch (error) {
      // Rollback on error
      set({ todos: previousTodos })
      throw error
    }
  },

  toggleTodo: async (id: string) => {
    const { todos } = get()
    const todo = todos.find(t => t.id === id)
    if (!todo) return

    // Optimistic update
    const previousTodos = todos
    set((state) => ({
      todos: state.todos.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      ),
    }))

    try {
      await api.updateTodo(id, { completed: !todo.completed })
    } catch (error) {
      // Rollback on error
      set({ todos: previousTodos })
      throw error
    }
  },

  selectTodo: (id: string | null) => {
    set({ selectedTodoId: id })
  },

  setActiveTodoView: (view: TodoViewType) => {
    set({ activeTodoView: view, selectedTodoId: null })
  },

  setTodoSearchQuery: (query: string) => {
    set({ todoSearchQuery: query })
  },

  setSelectedTodoProject: (project: string | null) => {
    set({ selectedTodoProject: project })
  },

  toggleTodoTag: (tag: string) => {
    set((state) => ({
      selectedTodoTags: state.selectedTodoTags.includes(tag)
        ? state.selectedTodoTags.filter((t) => t !== tag)
        : [...state.selectedTodoTags, tag],
    }))
  },

  clearSelectedTodoTags: () => {
    set({ selectedTodoTags: [] })
  },

  setCreateTodoOpen: (open: boolean) => {
    set({ isCreateTodoOpen: open })
  },

  // Computed
  getFilteredTickets: () => {
    const { tickets, activeView, selectedTags, selectedLabel, searchQuery, sortBy, hideDone } = get()

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
        filtered = filtered.filter((t) => !t.label && t.status !== 'done')
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

    // Filter by label
    if (selectedLabel !== null) {
      if (selectedLabel === '') {
        // Show tickets without a label (loose tickets)
        filtered = filtered.filter((t) => !t.label)
      } else {
        // Show tickets with the selected label
        filtered = filtered.filter((t) => t.label === selectedLabel)
      }
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter((t) => selectedTags.some((tag) => t.tags.includes(tag)))
    }

    // Hide done tickets if toggle is on (only in 'all' view)
    if (hideDone && activeView === 'all') {
      filtered = filtered.filter((t) => t.status !== 'done')
    }

    // Sort within status groups for manual sorting in 'all' view
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    const statusOrder = { 'in-progress': 0, 'todo': 1, 'done': 2 }

    // Helper to sort by manual order
    const sortByManualOrder = (a: Ticket, b: Ticket) => {
      const aOrder = a.order ?? Number.MAX_SAFE_INTEGER
      const bOrder = b.order ?? Number.MAX_SAFE_INTEGER
      if (aOrder !== bOrder) return aOrder - bOrder
      return new Date(a.created).getTime() - new Date(b.created).getTime()
    }

    return filtered.sort((a, b) => {
      // For 'all' view with manual sorting, group by status first
      if (activeView === 'all' && sortBy === 'manual') {
        const statusDiff = statusOrder[a.status] - statusOrder[b.status]
        if (statusDiff !== 0) return statusDiff
        return sortByManualOrder(a, b)
      }

      switch (sortBy) {
        case 'manual':
          return sortByManualOrder(a, b)
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

  getFilteredTodos: () => {
    const { todos, activeTodoView, selectedTodoProject, todoSearchQuery, selectedTodoTags } = get()

    // Parse date string as local date to avoid timezone issues
    const parseLocalDate = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number)
      return new Date(year, month - 1, day)
    }

    // Get today's date for comparison
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Calculate date 7 days from now for upcoming
    const upcoming = new Date(today)
    upcoming.setDate(upcoming.getDate() + 7)

    let filtered = todos

    // Filter by search query
    if (todoSearchQuery.trim()) {
      const query = todoSearchQuery.toLowerCase()
      filtered = filtered.filter((t) =>
        t.text.toLowerCase().includes(query) ||
        t.fileName.toLowerCase().includes(query) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Filter by view
    switch (activeTodoView) {
      case 'today':
        // Due today or overdue (and not completed)
        filtered = filtered.filter((t) => {
          if (t.completed) return false
          if (!t.dueDate) return false
          const dueDate = parseLocalDate(t.dueDate)
          return dueDate <= today
        })
        break
      case 'upcoming':
        // Due within 7 days (not today, not overdue, not completed)
        filtered = filtered.filter((t) => {
          if (t.completed) return false
          if (!t.dueDate) return false
          const dueDate = parseLocalDate(t.dueDate)
          return dueDate > today && dueDate <= upcoming
        })
        break
      case 'someday':
        // No due date and not completed
        filtered = filtered.filter((t) => !t.completed && !t.dueDate)
        break
      case 'done':
        filtered = filtered.filter((t) => t.completed)
        break
      case 'all':
      default:
        // Show all open todos by default
        filtered = filtered.filter((t) => !t.completed)
        break
    }

    // Filter by project
    if (selectedTodoProject !== null) {
      if (selectedTodoProject === '') {
        // Show todos without a project (root level files)
        filtered = filtered.filter((t) => !t.project)
      } else {
        filtered = filtered.filter((t) => t.project === selectedTodoProject)
      }
    }

    // Filter by tags
    if (selectedTodoTags.length > 0) {
      filtered = filtered.filter((t) => selectedTodoTags.some((tag) => t.tags?.includes(tag)))
    }

    // Sort: priority first, then due date, then created
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3, undefined: 4 }
    return filtered.sort((a, b) => {
      // First by priority
      const aPriority = priorityOrder[a.priority ?? 'undefined']
      const bPriority = priorityOrder[b.priority ?? 'undefined']
      if (aPriority !== bPriority) return aPriority - bPriority

      // Then by due date (earlier first, no due date last)
      if (a.dueDate && b.dueDate) {
        const dateDiff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        if (dateDiff !== 0) return dateDiff
      } else if (a.dueDate && !b.dueDate) {
        return -1
      } else if (!a.dueDate && b.dueDate) {
        return 1
      }

      // Then by file name and line number for consistent ordering
      const fileCompare = a.filePath.localeCompare(b.filePath)
      if (fileCompare !== 0) return fileCompare
      return a.lineNumber - b.lineNumber
    })
  },
}))
