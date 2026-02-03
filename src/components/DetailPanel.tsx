import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTicketStore } from '@/stores/ticketStore'
import type { TicketStatus, TicketPriority } from '@/types/ticket'

const statusOptions: { value: TicketStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

const priorityOptions: { value: TicketPriority; label: string }[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

function getObsidianDeeplink(filePath: string): string {
  const vaultName = 'inviplay'
  const encodedPath = encodeURIComponent(filePath.replace(/\.md$/, ''))
  return `obsidian://open?vault=${vaultName}&file=${encodedPath}`
}

export function DetailPanel() {
  const {
    mode,
    // Ticket state
    selectedTicketId,
    tickets,
    tags: allTags,
    projects: allProjects,
    selectTicket,
    updateTicket,
    deleteTicket,
    // Todo state
    selectedTodoId,
    todos,
    todoTags: allTodoTags,
    selectTodo,
    updateTodo,
    toggleTodo,
  } = useTicketStore()

  const ticket = tickets.find((t) => t.id === selectedTicketId)
  const todo = todos.find((t) => t.id === selectedTodoId)

  // Determine which item to show
  const isTicketMode = mode === 'tickets'
  const item = isTicketMode ? ticket : todo
  const isOpen = isTicketMode ? !!selectedTicketId : !!selectedTodoId

  // Form state for tickets
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [project, setProject] = useState('')
  const [newTag, setNewTag] = useState('')
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const [showProjectSuggestions, setShowProjectSuggestions] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)
  const projectInputRef = useRef<HTMLInputElement>(null)

  // Form state for todos
  const [todoText, setTodoText] = useState('')
  const [todoDescription, setTodoDescription] = useState('')
  const [todoDueDate, setTodoDueDate] = useState('')
  const [todoPriority, setTodoPriority] = useState<string>('')
  const [todoTags, setTodoTags] = useState<string[]>([])
  const [newTodoTag, setNewTodoTag] = useState('')
  const [showTodoTagSuggestions, setShowTodoTagSuggestions] = useState(false)
  const todoTagInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ticket) {
      setTitle(ticket.title)
      setDescription(ticket.description || '')
      setDueDate(ticket.dueDate || '')
      setProject(ticket.project || '')
      setIsArchiving(false)
    }
  }, [selectedTicketId])

  useEffect(() => {
    if (todo) {
      setTodoText(todo.text)
      setTodoDescription(todo.description || '')
      setTodoDueDate(todo.dueDate || '')
      setTodoPriority(todo.priority || '')
      setTodoTags(todo.tags || [])
    }
  }, [selectedTodoId])

  const handleClose = () => {
    if (isTicketMode) {
      selectTicket(null)
    } else {
      selectTodo(null)
    }
  }

  // Ticket handlers
  const handleTitleBlur = async () => {
    if (ticket && title !== ticket.title && title.trim()) {
      await updateTicket(ticket.id, { title: title.trim() })
    }
  }

  const handleDescriptionBlur = async () => {
    if (ticket && description !== (ticket.description || '')) {
      await updateTicket(ticket.id, { description })
    }
  }

  const handleStatusChange = async (status: TicketStatus) => {
    if (ticket) {
      await updateTicket(ticket.id, { status })
    }
  }

  const handlePriorityChange = async (priority: TicketPriority) => {
    if (ticket) {
      await updateTicket(ticket.id, { priority })
    }
  }

  const handleDueDateChange = async (newDueDate: string) => {
    setDueDate(newDueDate)
    if (ticket) {
      await updateTicket(ticket.id, { dueDate: newDueDate || null })
    }
  }

  const handleProjectSave = async () => {
    if (ticket && project !== (ticket.project || '')) {
      await updateTicket(ticket.id, { project: project || null })
    }
  }

  const handleProjectClear = async () => {
    setProject('')
    if (ticket) {
      await updateTicket(ticket.id, { project: null })
    }
  }

  const handleProjectKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleProjectSave()
      projectInputRef.current?.blur()
    } else if (e.key === 'Escape') {
      setProject(ticket?.project || '')
      setShowProjectSuggestions(false)
      projectInputRef.current?.blur()
    }
  }

  const filteredProjectSuggestions = allProjects.filter(
    (p) => p.toLowerCase().includes(project.toLowerCase()) && p !== project
  )

  const handleAddTag = async (tagToAdd: string) => {
    const tag = tagToAdd.trim().toLowerCase()
    if (ticket && tag && !ticket.tags.includes(tag)) {
      await updateTicket(ticket.id, { tags: [...ticket.tags, tag] })
    }
    setNewTag('')
    setShowTagSuggestions(false)
  }

  const handleRemoveTag = async (tagToRemove: string) => {
    if (ticket) {
      await updateTicket(ticket.id, { tags: ticket.tags.filter((t) => t !== tagToRemove) })
    }
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag(newTag)
    } else if (e.key === 'Escape') {
      setNewTag('')
      setShowTagSuggestions(false)
      tagInputRef.current?.blur()
    }
  }

  const filteredSuggestions = allTags.filter(
    (tag) =>
      tag.toLowerCase().includes(newTag.toLowerCase()) &&
      !ticket?.tags.includes(tag)
  )

  const handleArchive = async () => {
    if (ticket && window.confirm('Are you sure you want to archive this ticket?')) {
      setIsArchiving(true)
      try {
        await deleteTicket(ticket.id)
        selectTicket(null)
      } catch {
        setIsArchiving(false)
      }
    }
  }

  // Todo handlers
  const handleToggleTodo = async () => {
    if (todo) {
      await toggleTodo(todo.id)
    }
  }

  const handleOpenInObsidian = () => {
    if (todo) {
      window.open(getObsidianDeeplink(todo.filePath), '_blank')
    }
  }

  // Todo edit handlers
  const handleTodoTextBlur = async () => {
    if (todo && todoText !== todo.text && todoText.trim()) {
      await updateTodo(todo.id, { text: todoText.trim() })
    }
  }

  const handleTodoDescriptionBlur = async () => {
    if (todo && todoDescription !== (todo.description || '')) {
      await updateTodo(todo.id, { description: todoDescription || null })
    }
  }

  const handleTodoDueDateChange = async (newDate: string) => {
    setTodoDueDate(newDate)
    if (todo) {
      await updateTodo(todo.id, { dueDate: newDate || null })
    }
  }

  const handleTodoPriorityChange = async (newPriority: string) => {
    setTodoPriority(newPriority)
    if (todo) {
      await updateTodo(todo.id, { priority: (newPriority || null) as any })
    }
  }

  const handleAddTodoTag = async (tagToAdd: string) => {
    const tag = tagToAdd.trim().toLowerCase()
    if (todo && tag && !todoTags.includes(tag)) {
      const newTags = [...todoTags, tag].sort()
      setTodoTags(newTags)
      await updateTodo(todo.id, { tags: newTags })
    }
    setNewTodoTag('')
    setShowTodoTagSuggestions(false)
  }

  const handleRemoveTodoTag = async (tagToRemove: string) => {
    if (todo) {
      const newTags = todoTags.filter((t) => t !== tagToRemove)
      setTodoTags(newTags)
      await updateTodo(todo.id, { tags: newTags })
    }
  }

  const handleTodoTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTodoTag(newTodoTag)
    } else if (e.key === 'Escape') {
      setNewTodoTag('')
      setShowTodoTagSuggestions(false)
      todoTagInputRef.current?.blur()
    }
  }

  const filteredTodoTagSuggestions = allTodoTags.filter(
    (tag) =>
      tag.toLowerCase().includes(newTodoTag.toLowerCase()) &&
      !todoTags.includes(tag)
  )

  return (
    <AnimatePresence>
      {isOpen && item && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black z-40"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-[480px] bg-white shadow-xl z-50 flex flex-col"
          >
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {isTicketMode && ticket && (
                <button
                  onClick={handleArchive}
                  disabled={isArchiving}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  {isArchiving ? 'Archiving...' : 'Archive'}
                </button>
              )}
              {!isTicketMode && todo && (
                <button
                  onClick={handleOpenInObsidian}
                  className="text-gray-400 hover:text-blue-500 text-sm flex items-center gap-1"
                >
                  Open in Obsidian
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              )}
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Ticket Detail */}
              {isTicketMode && ticket && (
                <>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    className="w-full text-xl font-semibold text-gray-800 border-0 focus:ring-0 p-0 mb-4"
                    placeholder="Ticket title"
                  />

                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <label className="text-sm text-gray-500 w-20">Status</label>
                      <select
                        value={ticket.status}
                        onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                        className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {statusOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="text-sm text-gray-500 w-20">Priority</label>
                      <select
                        value={ticket.priority}
                        onChange={(e) => handlePriorityChange(e.target.value as TicketPriority)}
                        className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {priorityOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="text-sm text-gray-500 w-20">Due date</label>
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => handleDueDateChange(e.target.value)}
                          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {dueDate && (
                          <button
                            onClick={() => handleDueDateChange('')}
                            className="text-gray-400 hover:text-gray-600 p-1"
                            title="Clear due date"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="text-sm text-gray-500 w-20">Project</label>
                      <div className="flex-1 relative">
                        <div className="flex items-center gap-2">
                          <input
                            ref={projectInputRef}
                            type="text"
                            value={project}
                            onChange={(e) => {
                              setProject(e.target.value)
                              setShowProjectSuggestions(true)
                            }}
                            onFocus={() => setShowProjectSuggestions(true)}
                            onBlur={() => {
                              setTimeout(() => setShowProjectSuggestions(false), 150)
                              handleProjectSave()
                            }}
                            onKeyDown={handleProjectKeyDown}
                            placeholder="No project"
                            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                          {project && (
                            <button
                              onClick={handleProjectClear}
                              className="text-gray-400 hover:text-gray-600 p-1"
                              title="Clear project"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                        {showProjectSuggestions && filteredProjectSuggestions.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                            {filteredProjectSuggestions.map((p) => (
                              <button
                                key={p}
                                onClick={async () => {
                                  setProject(p)
                                  setShowProjectSuggestions(false)
                                  if (ticket) {
                                    await updateTicket(ticket.id, { project: p })
                                  }
                                }}
                                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <label className="text-sm text-gray-500 w-20 pt-2">Tags</label>
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {ticket.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 group"
                            >
                              {tag}
                              <button
                                onClick={() => handleRemoveTag(tag)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="relative">
                          <input
                            ref={tagInputRef}
                            type="text"
                            value={newTag}
                            onChange={(e) => {
                              setNewTag(e.target.value)
                              setShowTagSuggestions(true)
                            }}
                            onFocus={() => setShowTagSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowTagSuggestions(false), 150)}
                            onKeyDown={handleTagKeyDown}
                            placeholder="Add tag..."
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                          {showTagSuggestions && filteredSuggestions.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                              {filteredSuggestions.map((tag) => (
                                <button
                                  key={tag}
                                  onClick={() => handleAddTag(tag)}
                                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
                                >
                                  {tag}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-500 mb-2">Description</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onBlur={handleDescriptionBlur}
                        rows={6}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        placeholder="Add a description..."
                      />
                    </div>

                    {ticket.source && (
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">Source</label>
                        <p className="text-sm text-gray-700">{ticket.source}</p>
                      </div>
                    )}

                    {ticket.acceptanceCriteria && ticket.acceptanceCriteria.length > 0 && (
                      <div>
                        <label className="block text-sm text-gray-500 mb-2">Acceptance Criteria</label>
                        <ul className="space-y-1">
                          {ticket.acceptanceCriteria.map((criterion, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="text-gray-400">•</span>
                              {criterion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Todo Detail */}
              {!isTicketMode && todo && (
                <>
                  {/* Todo title with checkbox */}
                  <div className="flex items-start gap-3 mb-6">
                    <button
                      onClick={handleToggleTodo}
                      className={`mt-1 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                        todo.completed
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {todo.completed && (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <input
                      type="text"
                      value={todoText}
                      onChange={(e) => setTodoText(e.target.value)}
                      onBlur={handleTodoTextBlur}
                      className={`flex-1 text-xl font-semibold border-0 focus:ring-0 p-0 ${
                        todo.completed ? 'text-gray-400 line-through' : 'text-gray-800'
                      }`}
                      placeholder="Todo text"
                    />
                  </div>

                  <div className="space-y-4">
                    {/* Priority */}
                    <div className="flex items-center gap-4">
                      <label className="text-sm text-gray-500 w-20">Priority</label>
                      <select
                        value={todoPriority}
                        onChange={(e) => handleTodoPriorityChange(e.target.value)}
                        className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">None</option>
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>

                    {/* Due date */}
                    <div className="flex items-center gap-4">
                      <label className="text-sm text-gray-500 w-20">Due date</label>
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="date"
                          value={todoDueDate}
                          onChange={(e) => handleTodoDueDateChange(e.target.value)}
                          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {todoDueDate && (
                          <button
                            onClick={() => handleTodoDueDateChange('')}
                            className="text-gray-400 hover:text-gray-600 p-1"
                            title="Clear due date"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Project/Folder (read-only) */}
                    {todo.project && (
                      <div className="flex items-center gap-4">
                        <label className="text-sm text-gray-500 w-20">Folder</label>
                        <span className="text-sm text-gray-700">{todo.project}</span>
                      </div>
                    )}

                    {/* Tags */}
                    <div className="flex items-start gap-4">
                      <label className="text-sm text-gray-500 w-20 pt-2">Tags</label>
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {todoTags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 group"
                            >
                              {tag}
                              <button
                                onClick={() => handleRemoveTodoTag(tag)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="relative">
                          <input
                            ref={todoTagInputRef}
                            type="text"
                            value={newTodoTag}
                            onChange={(e) => {
                              setNewTodoTag(e.target.value)
                              setShowTodoTagSuggestions(true)
                            }}
                            onFocus={() => setShowTodoTagSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowTodoTagSuggestions(false), 150)}
                            onKeyDown={handleTodoTagKeyDown}
                            placeholder="Add tag..."
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                          {showTodoTagSuggestions && filteredTodoTagSuggestions.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                              {filteredTodoTagSuggestions.map((tag) => (
                                <button
                                  key={tag}
                                  onClick={() => handleAddTodoTag(tag)}
                                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
                                >
                                  {tag}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Description/Notes */}
                    <div>
                      <label className="block text-sm text-gray-500 mb-2">Notes</label>
                      <textarea
                        value={todoDescription}
                        onChange={(e) => setTodoDescription(e.target.value)}
                        onBlur={handleTodoDescriptionBlur}
                        rows={4}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        placeholder="Add notes..."
                      />
                    </div>

                    {/* Source file */}
                    <div className="flex items-center gap-4">
                      <label className="text-sm text-gray-500 w-20">File</label>
                      <button
                        onClick={handleOpenInObsidian}
                        className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
                      >
                        {todo.fileName}
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    </div>

                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <footer className="px-6 py-3 border-t border-gray-200 text-xs text-gray-400">
              {isTicketMode && ticket && (
                <>
                  <div className="flex justify-between">
                    <span>Created: {ticket.created}</span>
                    <span>Updated: {ticket.updated}</span>
                  </div>
                  <div className="mt-1 truncate">{ticket.filename}</div>
                </>
              )}
              {!isTicketMode && todo && (
                <>
                  <div className="truncate">{todo.filePath}</div>
                  <div className="mt-1">Line {todo.lineNumber}</div>
                </>
              )}
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
