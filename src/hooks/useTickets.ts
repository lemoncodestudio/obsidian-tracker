import { useEffect } from 'react'
import { useTicketStore } from '@/stores/ticketStore'

export function useTickets() {
  const {
    mode,
    // Ticket state
    backlogs,
    selectedBacklog,
    tickets,
    tags,
    projects,
    isLoading,
    error,
    fetchBacklogs,
    fetchTickets,
    fetchTags,
    fetchProjects,
    getFilteredTickets,
    // Todo state
    todos,
    todoProjects,
    todoTags,
    isTodosLoading,
    todosError,
    fetchTodos,
    getFilteredTodos,
  } = useTicketStore()

  // Fetch backlogs on mount (needed for ticket mode)
  useEffect(() => {
    fetchBacklogs()
  }, [fetchBacklogs])

  // Fetch ticket data when backlog changes
  useEffect(() => {
    if (mode === 'tickets' && selectedBacklog) {
      fetchTickets()
      fetchTags()
      fetchProjects()
    }
  }, [mode, selectedBacklog, fetchTickets, fetchTags, fetchProjects])

  // Fetch todo data when in todo mode
  useEffect(() => {
    if (mode === 'todos') {
      fetchTodos()
    }
  }, [mode, fetchTodos])

  // Poll for updates every 5 seconds based on current mode
  useEffect(() => {
    const interval = setInterval(() => {
      if (mode === 'tickets' && selectedBacklog) {
        fetchTickets()
        fetchTags()
        fetchProjects()
      } else if (mode === 'todos') {
        fetchTodos()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [mode, selectedBacklog, fetchTickets, fetchTags, fetchProjects, fetchTodos])

  return {
    // Ticket data
    backlogs,
    selectedBacklog,
    tickets,
    filteredTickets: getFilteredTickets(),
    tags,
    projects,
    isLoading,
    error,
    refresh: fetchTickets,
    // Todo data
    todos,
    filteredTodos: getFilteredTodos(),
    todoProjects,
    todoTags,
    isTodosLoading,
    todosError,
    refreshTodos: fetchTodos,
  }
}
