import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import { Sidebar } from './components/Sidebar'
import { TicketList } from './components/TicketList'
import { TicketDetail } from './components/TicketDetail'
import { useTickets } from './hooks/useTickets'
import { useKeyboard } from './hooks/useKeyboard'
import { useTicketStore } from './stores/ticketStore'
import type { TicketStatus } from './types/ticket'

function App() {
  useTickets()
  useKeyboard()

  const { tickets, updateTicket, reorderTicket, getFilteredTickets, sortBy } = useTicketStore()

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return

    // Check if dropped on Inbox - remove project
    if (destination.droppableId === 'view:inbox') {
      await updateTicket(draggableId, { project: null })
      return
    }

    // Check if dropped on a project in the sidebar
    if (destination.droppableId.startsWith('project:')) {
      const projectName = destination.droppableId.replace('project:', '')
      await updateTicket(draggableId, { project: projectName })
      return
    }

    // Handle ticket list reordering
    if (destination.droppableId === 'ticket-list' && source.droppableId === 'ticket-list') {
      if (destination.index === source.index) return

      const filteredTickets = getFilteredTickets()
      const items = [...filteredTickets]
      const [movedItem] = items.splice(source.index, 1)
      items.splice(destination.index, 0, movedItem)

      let newOrder: number
      const prevItem = items[destination.index - 1]
      const nextItem = items[destination.index + 1]

      if (!prevItem && nextItem) {
        newOrder = (nextItem.order ?? 1) - 1
      } else if (prevItem && !nextItem) {
        newOrder = (prevItem.order ?? items.length) + 1
      } else if (prevItem && nextItem) {
        const prevOrder = prevItem.order ?? destination.index - 1
        const nextOrder = nextItem.order ?? destination.index + 1
        newOrder = (prevOrder + nextOrder) / 2
      } else {
        newOrder = 1
      }

      await reorderTicket(draggableId, newOrder)
      return
    }

    // Handle board view drag (status columns)
    const statusColumns = ['todo', 'in-progress', 'done']
    if (statusColumns.includes(destination.droppableId)) {
      const newStatus = destination.droppableId as TicketStatus
      const oldStatus = source.droppableId as TicketStatus
      const ticket = tickets.find((t) => t.id === draggableId)

      if (!ticket) return

      // Get tickets in destination column sorted by order
      const getTicketsByStatus = (status: TicketStatus) => {
        const statusTickets = tickets.filter((t) => t.status === status)
        if (sortBy === 'manual') {
          return statusTickets.sort((a, b) => {
            const aOrder = a.order ?? Number.MAX_SAFE_INTEGER
            const bOrder = b.order ?? Number.MAX_SAFE_INTEGER
            if (aOrder !== bOrder) return aOrder - bOrder
            return new Date(a.created).getTime() - new Date(b.created).getTime()
          })
        }
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
        return statusTickets.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      }

      const destTickets = getTicketsByStatus(newStatus)
      const filteredDestTickets = oldStatus === newStatus
        ? destTickets.filter(t => t.id !== draggableId)
        : destTickets

      let newOrder: number
      const destIndex = destination.index
      const prevItem = filteredDestTickets[destIndex - 1]
      const nextItem = filteredDestTickets[destIndex]

      if (!prevItem && !nextItem) {
        newOrder = 1
      } else if (!prevItem && nextItem) {
        newOrder = (nextItem.order ?? 1) - 1
      } else if (prevItem && !nextItem) {
        newOrder = (prevItem.order ?? filteredDestTickets.length) + 1
      } else if (prevItem && nextItem) {
        const prevOrder = prevItem.order ?? destIndex - 1
        const nextOrder = nextItem.order ?? destIndex + 1
        newOrder = (prevOrder + nextOrder) / 2
      } else {
        newOrder = destIndex + 1
      }

      if (ticket.status !== newStatus) {
        await updateTicket(draggableId, { status: newStatus, order: newOrder })
      } else if (source.index !== destination.index) {
        await reorderTicket(draggableId, newOrder)
      }
    }
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex h-screen bg-white">
        <Sidebar />
        <TicketList />
        <TicketDetail />
      </div>
    </DragDropContext>
  )
}

export default App
