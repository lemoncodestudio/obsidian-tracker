import { Droppable, Draggable } from '@hello-pangea/dnd'
import { useTicketStore } from '@/stores/ticketStore'
import { TicketItem } from './TicketItem'
import { CreateTicket } from './CreateTicket'
import { ViewToggle } from './ViewToggle'
import { BoardView } from './BoardView'
import { SearchBar } from './SearchBar'
import { SortDropdown } from './SortDropdown'

export function TicketList() {
  const { getFilteredTickets, isLoading, error, activeView, displayMode, tickets, searchQuery, sortBy } = useTicketStore()
  const filteredTickets = getFilteredTickets()

  const viewLabels: Record<string, string> = {
    all: 'All Tickets',
    inbox: 'Inbox',
    today: 'In Progress',
    backlog: 'Backlog',
    done: 'Done',
  }

  // For board view, show total count instead of filtered
  const ticketCount = displayMode === 'board' ? tickets.length : filteredTickets.length

  const isDragDisabled = sortBy !== 'manual'

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <header className="px-6 py-4 border-b border-gray-200 bg-white space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-800">{viewLabels[activeView]}</h2>
            <span className="text-sm text-gray-400">{ticketCount} tickets</span>
          </div>
          <ViewToggle />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-md">
            <SearchBar />
          </div>
          <SortDropdown />
        </div>
      </header>

      {displayMode === 'list' && (
        <div className="px-6 py-4 border-b border-gray-100">
          <CreateTicket />
        </div>
      )}

      {displayMode === 'board' ? (
        <BoardView />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {isLoading && filteredTickets.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-500" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">{error}</div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              {searchQuery ? 'No tickets match your search' : 'No tickets found'}
            </div>
          ) : (
            <Droppable droppableId="ticket-list">
              {(provided) => (
                <ul
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="divide-y divide-gray-100"
                >
                  {filteredTickets.map((ticket, index) => (
                    <Draggable
                      key={ticket.id}
                      draggableId={ticket.id}
                      index={index}
                      isDragDisabled={isDragDisabled}
                    >
                      {(provided, snapshot) => (
                        <li
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`transition-shadow ${snapshot.isDragging ? 'shadow-lg bg-white rounded-lg' : ''}`}
                        >
                          <TicketItem ticket={ticket} isDragging={snapshot.isDragging} />
                        </li>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>
          )}
        </div>
      )}
    </div>
  )
}
