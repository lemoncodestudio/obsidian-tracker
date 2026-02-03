import { motion } from 'framer-motion'
import { Droppable } from '@hello-pangea/dnd'
import { useTicketStore } from '@/stores/ticketStore'
import type { ViewType } from '@/types/ticket'
import type { TodoViewType } from '@/types/todo'
import { TagFilter } from './TagFilter'
import { ModeToggle } from './ModeToggle'

const ticketViews: { id: ViewType; label: string; icon: string }[] = [
  { id: 'all', label: 'All Tickets', icon: '📋' },
  { id: 'inbox', label: 'Inbox', icon: '📥' },
  { id: 'today', label: 'In Progress', icon: '⚡' },
  { id: 'backlog', label: 'Backlog', icon: '📝' },
  { id: 'done', label: 'Done', icon: '✓' },
]

const todoViews: { id: TodoViewType; label: string; icon: string }[] = [
  { id: 'all', label: 'All Todos', icon: '☑️' },
  { id: 'today', label: 'Today', icon: '📅' },
  { id: 'upcoming', label: 'Upcoming', icon: '🗓️' },
  { id: 'someday', label: 'Someday', icon: '💭' },
  { id: 'done', label: 'Done', icon: '✓' },
]

// Format backlog path for display (PARA-aware)
function formatBacklogLabel(backlogPath: string): string {
  const parts = backlogPath.split('/')
  const name = parts[parts.length - 1] // last folder name

  if (backlogPath.startsWith('projects/')) {
    return `${name} (project)`
  } else if (backlogPath.startsWith('areas/')) {
    return `${name} (area)`
  }
  return name
}

export function Sidebar() {
  const {
    mode,
    // Ticket state
    backlogs,
    selectedBacklog,
    setSelectedBacklog,
    activeView,
    setActiveView,
    tickets,
    projects,
    selectedProject,
    setSelectedProject,
    // Todo state
    activeTodoView,
    setActiveTodoView,
    todos,
    todoProjects,
    selectedTodoProject,
    setSelectedTodoProject,
  } = useTicketStore()

  // Ticket counts
  const getTicketCounts = () => ({
    all: tickets.length,
    inbox: tickets.filter((t) => !t.project && t.status !== 'done').length,
    today: tickets.filter((t) => t.status === 'in-progress').length,
    backlog: tickets.filter((t) => t.status === 'todo').length,
    done: tickets.filter((t) => t.status === 'done').length,
  })

  const getTicketProjectCounts = () => {
    const counts: Record<string, number> = {}
    tickets.forEach((t) => {
      if (t.project) {
        counts[t.project] = (counts[t.project] || 0) + 1
      }
    })
    return counts
  }

  // Todo counts
  const getTodoCounts = () => {
    // Parse date string as local date to avoid timezone issues
    const parseLocalDate = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number)
      return new Date(year, month - 1, day)
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const upcoming = new Date(today)
    upcoming.setDate(upcoming.getDate() + 7)

    return {
      all: todos.filter(t => !t.completed).length,
      today: todos.filter(t => !t.completed && t.dueDate && parseLocalDate(t.dueDate) <= today).length,
      upcoming: todos.filter(t => !t.completed && t.dueDate && parseLocalDate(t.dueDate) > today && parseLocalDate(t.dueDate) <= upcoming).length,
      someday: todos.filter(t => !t.completed && !t.dueDate).length,
      done: todos.filter(t => t.completed).length,
    }
  }

  const getTodoProjectCounts = () => {
    const counts: Record<string, number> = {}
    todos
      .filter(t => !t.completed)
      .forEach((t) => {
        if (t.project) {
          counts[t.project] = (counts[t.project] || 0) + 1
        }
      })
    return counts
  }

  const ticketCounts = getTicketCounts()
  const ticketProjectCounts = getTicketProjectCounts()
  const todoCounts = getTodoCounts()
  const todoProjectCounts = getTodoProjectCounts()

  // Current views and state based on mode
  const views = mode === 'tickets' ? ticketViews : todoViews
  const currentActiveView = mode === 'tickets' ? activeView : activeTodoView
  // For todos, only show folders that have open todos
  const currentProjects = mode === 'tickets'
    ? projects
    : todoProjects.filter(p => todoProjectCounts[p] > 0)
  const currentSelectedProject = mode === 'tickets' ? selectedProject : selectedTodoProject
  const currentProjectCounts = mode === 'tickets' ? ticketProjectCounts : todoProjectCounts
  const counts = mode === 'tickets' ? ticketCounts : todoCounts

  const handleViewClick = (viewId: string) => {
    if (mode === 'tickets') {
      setActiveView(viewId as ViewType)
      setSelectedProject(null)
    } else {
      setActiveTodoView(viewId as TodoViewType)
      setSelectedTodoProject(null)
    }
  }

  const handleProjectClick = (project: string) => {
    if (mode === 'tickets') {
      setActiveView('all')
      setSelectedProject(project)
    } else {
      setActiveTodoView('all')
      setSelectedTodoProject(project)
    }
  }

  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-800 mb-3">Tracker</h1>
        <ModeToggle />

        {/* Backlog Switcher - only in ticket mode */}
        {mode === 'tickets' && backlogs.length > 0 && (
          <div className="mt-3">
            <select
              value={selectedBacklog || ''}
              onChange={(e) => setSelectedBacklog(e.target.value || null)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {backlogs.map((backlog) => (
                <option key={backlog} value={backlog}>
                  {formatBacklogLabel(backlog)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <nav className="flex-1 p-2 overflow-y-auto">
        <ul className="space-y-1">
          {views.map((view) => (
            <li key={view.id}>
              {mode === 'tickets' && view.id === 'inbox' ? (
                <Droppable droppableId="view:inbox">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleViewClick(view.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                          snapshot.isDraggingOver
                            ? 'bg-blue-100 ring-2 ring-blue-400'
                            : currentActiveView === view.id && currentSelectedProject === null
                            ? 'bg-sidebar-active text-gray-900 font-medium'
                            : 'text-gray-600 hover:bg-sidebar-hover'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{view.icon}</span>
                          <span>{view.label}</span>
                        </span>
                        {counts[view.id as keyof typeof counts] > 0 && (
                          <span className="text-xs text-gray-400">
                            {counts[view.id as keyof typeof counts]}
                          </span>
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
                  onClick={() => handleViewClick(view.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    currentActiveView === view.id && currentSelectedProject === null
                      ? 'bg-sidebar-active text-gray-900 font-medium'
                      : 'text-gray-600 hover:bg-sidebar-hover'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{view.icon}</span>
                    <span>{view.label}</span>
                  </span>
                  {counts[view.id as keyof typeof counts] > 0 && (
                    <span className="text-xs text-gray-400">
                      {counts[view.id as keyof typeof counts]}
                    </span>
                  )}
                </motion.button>
              )}
            </li>
          ))}
        </ul>

        {currentProjects.length > 0 && (
          <div className="mt-6">
            <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {mode === 'tickets' ? 'Projects' : 'Labels'}
            </h3>
            <ul className="space-y-1">
              {currentProjects.map((project) => (
                <li key={project}>
                  {mode === 'tickets' ? (
                    <Droppable droppableId={`project:${project}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                        >
                          <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => handleProjectClick(project)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                              snapshot.isDraggingOver
                                ? 'bg-blue-100 ring-2 ring-blue-400'
                                : currentSelectedProject === project
                                ? 'bg-sidebar-active text-gray-900 font-medium'
                                : 'text-gray-600 hover:bg-sidebar-hover'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="text-gray-400">#</span>
                              <span className="truncate">{project}</span>
                            </span>
                            {currentProjectCounts[project] > 0 && (
                              <span className="text-xs text-gray-400">
                                {currentProjectCounts[project]}
                              </span>
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
                      onClick={() => handleProjectClick(project)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                        currentSelectedProject === project
                          ? 'bg-sidebar-active text-gray-900 font-medium'
                          : 'text-gray-600 hover:bg-sidebar-hover'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-gray-400">📁</span>
                        <span className="truncate">{project}</span>
                      </span>
                      {currentProjectCounts[project] > 0 && (
                        <span className="text-xs text-gray-400">
                          {currentProjectCounts[project]}
                        </span>
                      )}
                    </motion.button>
                  )}
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
          <kbd className="px-1 py-0.5 bg-gray-100 rounded">m</kbd> switch mode
        </div>
        {mode === 'tickets' ? (
          <>
            <div>
              <kbd className="px-1 py-0.5 bg-gray-100 rounded">j</kbd>/<kbd className="px-1 py-0.5 bg-gray-100 rounded">k</kbd> navigate
            </div>
            <div>
              <kbd className="px-1 py-0.5 bg-gray-100 rounded">v</kbd> toggle view
            </div>
          </>
        ) : (
          <div>
            <kbd className="px-1 py-0.5 bg-gray-100 rounded">o</kbd> open in Obsidian
          </div>
        )}
        <div>
          <kbd className="px-1 py-0.5 bg-gray-100 rounded">⌘K</kbd> search
        </div>
      </div>
    </aside>
  )
}
