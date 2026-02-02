import { useEffect } from 'react'
import { useTicketStore } from '@/stores/ticketStore'

export function useTickets() {
  const {
    tickets,
    tags,
    projects,
    isLoading,
    error,
    fetchTickets,
    fetchTags,
    fetchProjects,
    getFilteredTickets,
  } = useTicketStore()

  useEffect(() => {
    fetchTickets()
    fetchTags()
    fetchProjects()
  }, [fetchTickets, fetchTags, fetchProjects])

  // Poll for updates every 5 seconds (file watcher will handle real-time via SSE in the future)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTickets()
      fetchTags()
      fetchProjects()
    }, 5000)

    return () => clearInterval(interval)
  }, [fetchTickets, fetchTags, fetchProjects])

  return {
    tickets,
    filteredTickets: getFilteredTickets(),
    tags,
    projects,
    isLoading,
    error,
    refresh: fetchTickets,
  }
}
