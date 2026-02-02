import { Droppable, Draggable } from '@hello-pangea/dnd'
import { useTicketStore } from '@/stores/ticketStore'
import { getTagClasses } from '@/lib/tagColors'
import type { Ticket, TicketStatus } from '@/types/ticket'

const columns: { id: TicketStatus; title: string; color: string }[] = [
  { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-blue-50' },
  { id: 'done', title: 'Done', color: 'bg-green-50' },
]

const priorityColors: Record<string, string> = {
  urgent: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-gray-300',
}

function isOverdue(dueDate: string | undefined, status: TicketStatus): boolean {
  if (!dueDate || status === 'done') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  return due < today
}

function formatDueDate(dueDate: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays <= 7) return `${diffDays}d`
  return dueDate
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

export function BoardView() {
  const { tickets, selectedTags, selectedProject, searchQuery, selectTicket, selectedTicketId, sortBy } = useTicketStore()

  // Filter by search query, tags, and project
  let filteredTickets = tickets

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase()
    filteredTickets = filteredTickets.filter((t) =>
      t.title.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query) ||
      t.tags.some((tag) => tag.toLowerCase().includes(query))
    )
  }

  if (selectedTags.length > 0) {
    filteredTickets = filteredTickets.filter((t) => selectedTags.some((tag) => t.tags.includes(tag)))
  }

  if (selectedProject !== null) {
    if (selectedProject === '') {
      // Show tickets without a project (loose tickets)
      filteredTickets = filteredTickets.filter((t) => !t.project)
    } else {
      // Show tickets with the selected project
      filteredTickets = filteredTickets.filter((t) => t.project === selectedProject)
    }
  }

  const getTicketsByStatus = (status: TicketStatus): Ticket[] => {
    const statusTickets = filteredTickets.filter((t) => t.status === status)

    if (sortBy === 'manual') {
      // Sort by order field, tickets without order go to end
      return statusTickets.sort((a, b) => {
        const aOrder = a.order ?? Number.MAX_SAFE_INTEGER
        const bOrder = b.order ?? Number.MAX_SAFE_INTEGER
        if (aOrder !== bOrder) return aOrder - bOrder
        return new Date(a.created).getTime() - new Date(b.created).getTime()
      })
    }

    // Fallback to priority sort
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    return statusTickets.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
  }

  return (
    <div className="flex-1 flex gap-4 p-4 overflow-x-auto">
        {columns.map((column) => (
          <div key={column.id} className="flex-1 min-w-[280px] max-w-[400px] flex flex-col">
            <div className={`px-3 py-2 rounded-t-lg ${column.color}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-700">{column.title}</h3>
                <span className="text-sm text-gray-500">
                  {getTicketsByStatus(column.id).length}
                </span>
              </div>
            </div>

            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 p-2 space-y-2 rounded-b-lg border border-t-0 border-gray-200 overflow-y-auto transition-colors ${
                    snapshot.isDraggingOver ? 'bg-blue-50' : 'bg-gray-50'
                  }`}
                  style={{ minHeight: '200px' }}
                >
                  {getTicketsByStatus(column.id).map((ticket, index) => {
                    const overdue = isOverdue(ticket.dueDate, ticket.status)
                    return (
                      <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => selectTicket(ticket.id)}
                            className={`p-3 rounded-lg shadow-sm border-l-4 cursor-pointer transition-shadow ${
                              priorityColors[ticket.priority]
                            } ${snapshot.isDragging ? 'shadow-lg' : 'hover:shadow-md'} ${
                              selectedTicketId === ticket.id ? 'ring-2 ring-blue-500' : ''
                            } ${overdue ? 'bg-red-50' : 'bg-white'}`}
                          >
                            <h4 className={`text-sm font-medium mb-1 ${
                              ticket.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-800'
                            }`}>
                              {ticket.title}
                            </h4>

                            {ticket.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {ticket.tags.slice(0, 2).map((tag) => (
                                  <span
                                    key={tag}
                                    className={`px-1.5 py-0.5 text-xs rounded font-medium ${getTagClasses(tag)}`}
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {ticket.tags.length > 2 && (
                                  <span className="text-xs text-gray-400">
                                    +{ticket.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                              <span className="capitalize">{ticket.priority}</span>
                              {ticket.dueDate ? (
                                <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : ''}`}>
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  {formatDueDate(ticket.dueDate)}
                                </span>
                              ) : (
                                <span>{formatRelativeTime(ticket.updated)}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    )
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
    </div>
  )
}
