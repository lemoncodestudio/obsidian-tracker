import { useEffect, useCallback } from 'react'
import { useTicketStore } from '@/stores/ticketStore'

function getObsidianDeeplink(filePath: string): string {
  const vaultName = 'inviplay' // This should match your VAULT_PATH setting
  const encodedPath = encodeURIComponent(filePath.replace(/\.md$/, ''))
  return `obsidian://open?vault=${vaultName}&file=${encodedPath}`
}

export function useKeyboard() {
  const {
    mode,
    setMode,
    // Ticket state
    getFilteredTickets,
    selectedTicketId,
    selectTicket,
    displayMode,
    setDisplayMode,
    // Todo state
    getFilteredTodos,
    selectedTodoId,
    selectTodo,
    todos,
    setCreateTodoOpen,
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

    // Mode toggle - works in both modes
    if (e.key === 'm') {
      e.preventDefault()
      setMode(mode === 'tickets' ? 'todos' : 'tickets')
      return
    }

    // Quick add todo - works globally (like Todoist)
    if (e.key === 'q') {
      e.preventDefault()
      setCreateTodoOpen(true)
      return
    }

    if (mode === 'tickets') {
      // Ticket mode shortcuts
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
    } else {
      // Todo mode shortcuts
      const filteredTodos = getFilteredTodos()
      // Only consider top-level todos for navigation
      const topLevelTodos = filteredTodos.filter(t => !t.parentId)
      const currentIndex = selectedTodoId
        ? topLevelTodos.findIndex((t) => t.id === selectedTodoId)
        : -1

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault()
          if (topLevelTodos.length > 0) {
            const nextIndex = currentIndex < topLevelTodos.length - 1 ? currentIndex + 1 : 0
            selectTodo(topLevelTodos[nextIndex].id)
          }
          break

        case 'k':
        case 'ArrowUp':
          e.preventDefault()
          if (topLevelTodos.length > 0) {
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : topLevelTodos.length - 1
            selectTodo(topLevelTodos[prevIndex].id)
          }
          break

        case 'Escape':
          selectTodo(null)
          break

        case 'o':
          // Open selected todo in Obsidian
          if (selectedTodoId) {
            const todo = todos.find(t => t.id === selectedTodoId)
            if (todo) {
              window.open(getObsidianDeeplink(todo.filePath), '_blank')
            }
          }
          break

        case 'n':
          e.preventDefault()
          // Open the create todo modal
          setCreateTodoOpen(true)
          break
      }
    }
  }, [
    mode,
    setMode,
    getFilteredTickets,
    selectedTicketId,
    selectTicket,
    displayMode,
    setDisplayMode,
    getFilteredTodos,
    selectedTodoId,
    selectTodo,
    todos,
    setCreateTodoOpen,
  ])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
