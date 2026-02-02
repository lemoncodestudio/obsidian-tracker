import { useEffect, useCallback } from 'react'
import { useTicketStore } from '@/stores/ticketStore'

export function useKeyboard() {
  const {
    getFilteredTickets,
    selectedTicketId,
    selectTicket,
    displayMode,
    setDisplayMode,
  } = useTicketStore()

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't handle if user is typing in an input
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    ) {
      return
    }

    // Don't handle if modifier keys are pressed (except for arrows)
    if ((e.metaKey || e.ctrlKey || e.altKey) && !['ArrowUp', 'ArrowDown'].includes(e.key)) {
      return
    }

    const tickets = getFilteredTickets()
    const currentIndex = selectedTicketId
      ? tickets.findIndex((t) => t.id === selectedTicketId)
      : -1

    switch (e.key) {
      case 'j':
      case 'ArrowDown':
        e.preventDefault()
        if (tickets.length > 0) {
          const nextIndex = currentIndex < tickets.length - 1 ? currentIndex + 1 : 0
          selectTicket(tickets[nextIndex].id)
        }
        break

      case 'k':
      case 'ArrowUp':
        e.preventDefault()
        if (tickets.length > 0) {
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : tickets.length - 1
          selectTicket(tickets[prevIndex].id)
        }
        break

      case 'Escape':
        selectTicket(null)
        break

      case 'v':
        setDisplayMode(displayMode === 'list' ? 'board' : 'list')
        break

      case 'n':
        e.preventDefault()
        // Switch to list view if in board view (CreateTicket is only in list view)
        if (displayMode === 'board') {
          setDisplayMode('list')
        }
        // Focus the new ticket input after a short delay to allow view switch
        setTimeout(() => {
          const input = document.getElementById('new-ticket-input')
          if (input) {
            input.focus()
          }
        }, 50)
        break
    }
  }, [getFilteredTickets, selectedTicketId, selectTicket, displayMode, setDisplayMode])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
