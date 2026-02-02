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

export function TicketDetail() {
  const { selectedTicketId, tickets, tags: allTags, projects: allProjects, selectTicket, updateTicket, deleteTicket } = useTicketStore()
  const ticket = tickets.find((t) => t.id === selectedTicketId)

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

  useEffect(() => {
    if (ticket) {
      setTitle(ticket.title)
      setDescription(ticket.description || '')
      setDueDate(ticket.dueDate || '')
      setProject(ticket.project || '')
      setIsArchiving(false)
    }
  }, [selectedTicketId])

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

  return (
    <AnimatePresence>
      {ticket && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            onClick={() => selectTicket(null)}
            className="fixed inset-0 bg-black z-40"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-[480px] bg-white shadow-xl z-50 flex flex-col"
          >
            <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <button
                onClick={() => selectTicket(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <button
                onClick={handleArchive}
                disabled={isArchiving}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                {isArchiving ? 'Archiving...' : 'Archive'}
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6">
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
            </div>

            <footer className="px-6 py-3 border-t border-gray-200 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Created: {ticket.created}</span>
                <span>Updated: {ticket.updated}</span>
              </div>
              <div className="mt-1 truncate">{ticket.filename}</div>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
