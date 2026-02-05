import { DragDropContext, DropResult, DragUpdate } from '@hello-pangea/dnd'
import { Sidebar } from './components/Sidebar'
import { TicketList } from './components/TicketList'
import { DetailPanel } from './components/DetailPanel'
import { TodoList } from './components/TodoList'
import { CreateTodoModal } from './components/CreateTodo'
import { useTickets } from './hooks/useTickets'
import { useKeyboard } from './hooks/useKeyboard'
import { useTicketStore } from './stores/ticketStore'
import type { TicketStatus } from './types/ticket'

function App() {
  useTickets()
  useKeyboard()

  const { mode, tickets, updateTicket, reorderTicket, getFilteredTickets, sortBy, setDragDestination } = useTicketStore()

  const handleDragUpdate = (update: DragUpdate) => {
    if (update.destination) {
      setDragDestination({
        droppableId: update.destination.droppableId,
        index: update.destination.index,
      })
    } else {
      setDragDestination(null)
    }
  }

  const handleDragEnd = async (result: DropResult) => {
    // Clear drag destination
    setDragDestination(null)

    // Only handle drag and drop in tickets mode
    if (mode !== 'tickets') return

    const { destination, source, draggableId } = result

    if (!destination) return

    // Check if dropped on Inbox - remove label
    if (destination.droppableId === 'view:inbox') {
      await updateTicket(draggableId, { label: null })
      return
    }

    // Check if dropped on a label in the sidebar
    if (destination.droppableId.startsWith('label:')) {
      const labelName = destination.droppableId.replace('label:', '')
      await updateTicket(draggableId, { label: labelName })
      return
    }

    // Handle ticket list reordering (original single list)
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

    // Handle status-sectioned list reordering (within same status or across statuses)
    const statusDroppables = ['status:in-progress', 'status:todo', 'status:done']
    if (statusDroppables.includes(source.droppableId) && statusDroppables.includes(destination.droppableId)) {
      const statusMap: Record<string, TicketStatus> = {
        'status:in-progress': 'in-progress',
        'status:todo': 'todo',
        'status:done': 'done',
      }
      const sourceStatus = statusMap[source.droppableId]
      const destStatus = statusMap[destination.droppableId]
      const isSameSection = source.droppableId === destination.droppableId

      // If same section and same position, do nothing
      if (isSameSection && destination.index === source.index) return

      // Get tickets for destination status section (excluding the dragged ticket if moving within same section)
      const destTickets = tickets
        .filter(t => t.status === destStatus && (isSameSection ? t.id !== draggableId : true))
        .sort((a, b) => {
          const aOrder = a.order ?? Number.MAX_SAFE_INTEGER
          const bOrder = b.order ?? Number.MAX_SAFE_INTEGER
          if (aOrder !== bOrder) return aOrder - bOrder
          return new Date(a.created).getTime() - new Date(b.created).getTime()
        })

      // Calculate new order based on destination position
      let newOrder: number
      const prevItem = destTickets[destination.index - 1]
      const nextItem = destTickets[destination.index]

      if (!prevItem && !nextItem) {
        newOrder = 1
      } else if (!prevItem && nextItem) {
        newOrder = (nextItem.order ?? 1) - 1
      } else if (prevItem && !nextItem) {
        newOrder = (prevItem.order ?? destTickets.length) + 1
      } else if (prevItem && nextItem) {
        const prevOrder = prevItem.order ?? destination.index - 1
        const nextOrder = nextItem.order ?? destination.index + 1
        newOrder = (prevOrder + nextOrder) / 2
      } else {
        newOrder = destination.index + 1
      }

      // Update status if moving to different section, always update order
      if (sourceStatus !== destStatus) {
        await updateTicket(draggableId, { status: destStatus, order: newOrder })
      } else {
        await reorderTicket(draggableId, newOrder)
      }
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
    <DragDropContext onDragEnd={handleDragEnd} onDragUpdate={handleDragUpdate}>
      <div className="flex h-screen bg-white">
        <Sidebar />
        {mode === 'tickets' ? <TicketList /> : <TodoList />}
        <DetailPanel />
      </div>
      <CreateTodoModal />
    </DragDropContext>
  )
}

export default App
