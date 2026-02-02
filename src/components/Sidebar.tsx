import { motion } from 'framer-motion'
import { Droppable } from '@hello-pangea/dnd'
import { useTicketStore } from '@/stores/ticketStore'
import type { ViewType } from '@/types/ticket'
import { TagFilter } from './TagFilter'

const views: { id: ViewType; label: string; icon: string }[] = [
  { id: 'all', label: 'All Tickets', icon: '📋' },
  { id: 'inbox', label: 'Inbox', icon: '📥' },
  { id: 'today', label: 'In Progress', icon: '⚡' },
  { id: 'backlog', label: 'Backlog', icon: '📝' },
  { id: 'done', label: 'Done', icon: '✓' },
]

export function Sidebar() {
  const { activeView, setActiveView, tickets, projects, selectedProject, setSelectedProject } = useTicketStore()

  const getCounts = () => ({
    all: tickets.length,
    inbox: tickets.filter((t) => t.status === 'todo' && t.priority === 'urgent').length,
    today: tickets.filter((t) => t.status === 'in-progress').length,
    backlog: tickets.filter((t) => t.status === 'todo').length,
    done: tickets.filter((t) => t.status === 'done').length,
  })

  const getProjectCounts = () => {
    const counts: Record<string, number> = {}
    tickets.forEach((t) => {
      if (t.project) {
        counts[t.project] = (counts[t.project] || 0) + 1
      }
    })
    return counts
  }

  const counts = getCounts()
  const projectCounts = getProjectCounts()

  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-800">Ticket Tracker</h1>
      </div>

      <nav className="flex-1 p-2 overflow-y-auto">
        <ul className="space-y-1">
          {views.map((view) => (
            <li key={view.id}>
              {view.id === 'inbox' ? (
                <Droppable droppableId="view:inbox">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => {
                          setActiveView(view.id)
                          setSelectedProject(null)
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                          snapshot.isDraggingOver
                            ? 'bg-blue-100 ring-2 ring-blue-400'
                            : activeView === view.id && selectedProject === null
                            ? 'bg-sidebar-active text-gray-900 font-medium'
                            : 'text-gray-600 hover:bg-sidebar-hover'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{view.icon}</span>
                          <span>{view.label}</span>
                        </span>
                        {counts[view.id] > 0 && (
                          <span className="text-xs text-gray-400">{counts[view.id]}</span>
                        )}
                      </motion.button>
                      <div className="hidden">{provided.placeholder}</div>
                    </div>
                  )}
                </Droppable>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    setActiveView(view.id)
                    setSelectedProject(null)
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeView === view.id && selectedProject === null
                      ? 'bg-sidebar-active text-gray-900 font-medium'
                      : 'text-gray-600 hover:bg-sidebar-hover'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{view.icon}</span>
                    <span>{view.label}</span>
                  </span>
                  {counts[view.id] > 0 && (
                    <span className="text-xs text-gray-400">{counts[view.id]}</span>
                  )}
                </motion.button>
              )}
            </li>
          ))}
        </ul>

        {projects.length > 0 && (
          <div className="mt-6">
            <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Projects
            </h3>
            <ul className="space-y-1">
              {projects.map((project) => (
              <li key={project}>
                <Droppable droppableId={`project:${project}`}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => {
                          setActiveView('all')
                          setSelectedProject(project)
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                          snapshot.isDraggingOver
                            ? 'bg-blue-100 ring-2 ring-blue-400'
                            : selectedProject === project
                            ? 'bg-sidebar-active text-gray-900 font-medium'
                            : 'text-gray-600 hover:bg-sidebar-hover'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-gray-400">#</span>
                          <span className="truncate">{project}</span>
                        </span>
                        {projectCounts[project] > 0 && (
                          <span className="text-xs text-gray-400">{projectCounts[project]}</span>
                        )}
                      </motion.button>
                      <div className="hidden">{provided.placeholder}</div>
                    </div>
                  )}
                </Droppable>
              </li>
            ))}
            </ul>
          </div>
        )}

        <div className="mt-6">
          <TagFilter />
        </div>
      </nav>

      <div className="p-3 border-t border-gray-200 text-xs text-gray-400 space-y-1">
        <div>
          <kbd className="px-1 py-0.5 bg-gray-100 rounded">j</kbd>/<kbd className="px-1 py-0.5 bg-gray-100 rounded">k</kbd> navigate
        </div>
        <div>
          <kbd className="px-1 py-0.5 bg-gray-100 rounded">v</kbd> toggle view
        </div>
        <div>
          <kbd className="px-1 py-0.5 bg-gray-100 rounded">⌘K</kbd> search
        </div>
      </div>
    </aside>
  )
}
