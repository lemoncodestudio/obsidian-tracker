import { Droppable, Draggable } from '@hello-pangea/dnd'
import { useTicketStore } from '@/stores/ticketStore'
import { TicketItem } from './TicketItem'
import { CreateTicket } from './CreateTicket'
import { ViewToggle } from './ViewToggle'
import { BoardView } from './BoardView'
import { SearchBar } from './SearchBar'
import { SortDropdown } from './SortDropdown'
import type { Ticket, TicketStatus } from '@/types/ticket'

function DropIndicator() {
  return <div className="h-1 bg-blue-500 rounded-full mx-4 my-1" />
}

export function TicketList() {
  const { getFilteredTickets, isLoading, error, activeView, displayMode, tickets, searchQuery, sortBy, hideDone, setHideDone, groupByStatus, setGroupByStatus, dragDestination } = useTicketStore()
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

  // Group tickets by status for sectioned display (only in 'all' view with manual sort and grouping enabled)
  const showSections = activeView === 'all' && sortBy === 'manual' && displayMode === 'list' && groupByStatus

  const getTicketsByStatus = (status: TicketStatus): Ticket[] => {
    return filteredTickets.filter(t => t.status === status)
  }

  const inProgressTickets = showSections ? getTicketsByStatus('in-progress') : []
  const todoTickets = showSections ? getTicketsByStatus('todo') : []
  const doneTickets = showSections ? getTicketsByStatus('done') : []

  const renderTicketSection = (sectionTickets: Ticket[], droppableId: string, sectionLabel?: string, showSeparator?: boolean) => {
    if (sectionTickets.length === 0 && !sectionLabel) return null

    return (
      <div key={droppableId}>
        {sectionLabel && (
          <div className={`px-6 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 ${showSeparator ? 'border-t-2 border-gray-300 mt-4' : ''}`}>
            {sectionLabel} ({sectionTickets.length})
          </div>
        )}
        <Droppable droppableId={droppableId}>
          {(provided) => (
            <ul
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="divide-y divide-gray-100"
            >
              {sectionTickets.map((ticket, index) => (
                <Draggable
                  key={ticket.id}
                  draggableId={ticket.id}
                  index={index}
                  isDragDisabled={isDragDisabled}
                >
                  {(provided, snapshot) => (
                    <>
                      <li
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`transition-shadow ${snapshot.isDragging ? 'shadow-lg bg-white rounded-lg z-50' : ''}`}
                      >
                        <TicketItem ticket={ticket} isDragging={snapshot.isDragging} />
                      </li>
                      {dragDestination?.droppableId === droppableId && dragDestination.index === index && (
                        <DropIndicator />
                      )}
                    </>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </div>
    )
  }

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
          {activeView === 'all' && (
            <>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={groupByStatus}
                  onChange={(e) => setGroupByStatus(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                Groepeer op status
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideDone}
                  onChange={(e) => setHideDone(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                Hide done
              </label>
            </>
          )}
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
          ) : showSections ? (
            <>
              {renderTicketSection(inProgressTickets, 'status:in-progress', 'In Progress')}
              {renderTicketSection(todoTickets, 'status:todo', 'Todo')}
              {!hideDone && renderTicketSection(doneTickets, 'status:done', 'Done', true)}
            </>
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
                        <>
                          <li
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`transition-shadow ${snapshot.isDragging ? 'shadow-lg bg-white rounded-lg z-50' : ''}`}
                          >
                            <TicketItem ticket={ticket} isDragging={snapshot.isDragging} />
                          </li>
                          {dragDestination?.droppableId === 'ticket-list' && dragDestination.index === index && (
                            <DropIndicator />
                          )}
                        </>
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
