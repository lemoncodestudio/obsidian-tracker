import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTicketStore } from '@/stores/ticketStore'
import { getTagClasses } from '@/lib/tagColors'
import type { TodoPriority } from '@/types/todo'

function formatProjectLabel(projectPath: string): string {
  const parts = projectPath.split('/')
  const name = parts[parts.length - 1]

  if (projectPath.startsWith('projects/')) {
    return `${name} (project)`
  } else if (projectPath.startsWith('areas/')) {
    return `${name} (area)`
  }
  return name
}

function getTodayDate(): string {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

function formatDateLabel(date: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [year, month, day] = date.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  const diffDays = Math.round((dateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Vandaag'
  if (diffDays === 1) return 'Morgen'
  if (diffDays === -1) return 'Gisteren'
  if (diffDays > 1 && diffDays <= 7) return `Over ${diffDays} dagen`
  return date
}

const priorityConfig: Record<TodoPriority, { label: string; color: string; bgColor: string }> = {
  urgent: { label: 'Urgent', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200' },
  high: { label: 'Hoog', color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-200' },
  medium: { label: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-200' },
  low: { label: 'Laag', color: 'text-gray-500', bgColor: 'bg-gray-50 border-gray-200' },
}

export function CreateTodoModal() {
  const [text, setText] = useState('')
  const [projectPath, setProjectPath] = useState<string>('')
  const [dueDate, setDueDate] = useState<string>(getTodayDate())
  const [priority, setPriority] = useState<TodoPriority | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)

  // Dropdown states
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showPriorityPicker, setShowPriorityPicker] = useState(false)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [tagInput, setTagInput] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const datePickerRef = useRef<HTMLDivElement>(null)
  const priorityPickerRef = useRef<HTMLDivElement>(null)
  const tagPickerRef = useRef<HTMLDivElement>(null)

  const { createTodo, todoProjectPaths, todoTags, isCreateTodoOpen, setCreateTodoOpen } = useTicketStore()

  // Focus input when modal opens
  useEffect(() => {
    if (isCreateTodoOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isCreateTodoOpen])

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false)
      }
      if (priorityPickerRef.current && !priorityPickerRef.current.contains(e.target as Node)) {
        setShowPriorityPicker(false)
      }
      if (tagPickerRef.current && !tagPickerRef.current.contains(e.target as Node)) {
        setShowTagPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle escape to close modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isCreateTodoOpen) {
        handleClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isCreateTodoOpen])

  // Filter tag suggestions
  const tagSuggestions = todoTags.filter(t =>
    t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t)
  )

  const resetForm = () => {
    setText('')
    setProjectPath('')
    setDueDate(getTodayDate())
    setPriority(null)
    setTags([])
    setTagInput('')
    setShowDatePicker(false)
    setShowPriorityPicker(false)
    setShowTagPicker(false)
  }

  const handleClose = () => {
    resetForm()
    setCreateTodoOpen(false)
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!text.trim()) return

    setIsCreating(true)
    try {
      await createTodo({
        text: text.trim(),
        projectPath: projectPath || undefined,
        dueDate: dueDate || undefined,
        priority: priority || undefined,
        tags: tags.length > 0 ? tags : undefined,
      })
      resetForm()
      setCreateTodoOpen(false)
    } catch (error) {
      console.error('Failed to create todo:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleAddTag = (tag: string) => {
    const normalizedTag = tag.toLowerCase().replace(/^#/, '')
    if (normalizedTag && !tags.includes(normalizedTag)) {
      setTags([...tags, normalizedTag].sort())
    }
    setTagInput('')
    setShowTagPicker(false)
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove))
  }

  return (
    <AnimatePresence>
      {isCreateTodoOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/30 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 pointer-events-none"
          >
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 w-full max-w-lg pointer-events-auto">
              <form onSubmit={handleSubmit}>
                {/* Text input */}
                <div className="px-4 pt-4 pb-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Taaknaam"
                    disabled={isCreating}
                    className="w-full text-base font-medium border-0 focus:ring-0 p-0 placeholder-gray-400 disabled:opacity-50"
                  />
                </div>

                {/* Chip buttons row */}
                <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
                  {/* Date chip */}
                  <div className="relative" ref={datePickerRef}>
                    {dueDate ? (
                      <button
                        type="button"
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDateLabel(dueDate)}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDueDate('')
                          }}
                          className="ml-0.5 hover:text-green-900"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Datum
                      </button>
                    )}

                    {/* Date picker dropdown */}
                    {showDatePicker && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-2">
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => {
                            setDueDate(e.target.value)
                            setShowDatePicker(false)
                          }}
                          className="text-sm border border-gray-200 rounded px-2 py-1"
                        />
                        <div className="mt-2 space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setDueDate(getTodayDate())
                              setShowDatePicker(false)
                            }}
                            className="w-full text-left px-2 py-1 text-sm hover:bg-gray-50 rounded"
                          >
                            Vandaag
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const tomorrow = new Date()
                              tomorrow.setDate(tomorrow.getDate() + 1)
                              setDueDate(tomorrow.toISOString().split('T')[0])
                              setShowDatePicker(false)
                            }}
                            className="w-full text-left px-2 py-1 text-sm hover:bg-gray-50 rounded"
                          >
                            Morgen
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDueDate('')
                              setShowDatePicker(false)
                            }}
                            className="w-full text-left px-2 py-1 text-sm text-gray-500 hover:bg-gray-50 rounded"
                          >
                            Geen datum
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Priority chip */}
                  <div className="relative" ref={priorityPickerRef}>
                    {priority ? (
                      <button
                        type="button"
                        onClick={() => setShowPriorityPicker(!showPriorityPicker)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm rounded-lg border transition-colors ${priorityConfig[priority].bgColor} ${priorityConfig[priority].color}`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                        </svg>
                        {priorityConfig[priority].label}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setPriority(null)
                          }}
                          className="ml-0.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowPriorityPicker(!showPriorityPicker)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                        </svg>
                        Prioriteit
                      </button>
                    )}

                    {/* Priority picker dropdown */}
                    {showPriorityPicker && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[120px]">
                        {(Object.entries(priorityConfig) as [TodoPriority, typeof priorityConfig[TodoPriority]][]).map(([key, config]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setPriority(key)
                              setShowPriorityPicker(false)
                            }}
                            className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${config.color}`}
                          >
                            {config.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tags chip */}
                  <div className="relative" ref={tagPickerRef}>
                    <button
                      type="button"
                      onClick={() => setShowTagPicker(!showTagPicker)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Tags
                    </button>

                    {/* Tag picker dropdown */}
                    {showTagPicker && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-2 min-w-[180px]">
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && tagInput.trim()) {
                              e.preventDefault()
                              handleAddTag(tagInput.trim())
                            }
                          }}
                          placeholder="Zoek of maak tag..."
                          className="w-full text-sm border border-gray-200 rounded px-2 py-1 mb-2"
                          autoFocus
                        />
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {tagSuggestions.slice(0, 8).map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => handleAddTag(tag)}
                              className="w-full text-left px-2 py-1 text-sm hover:bg-gray-50 rounded"
                            >
                              #{tag}
                            </button>
                          ))}
                          {tagInput.trim() && !tagSuggestions.includes(tagInput.toLowerCase()) && (
                            <button
                              type="button"
                              onClick={() => handleAddTag(tagInput.trim())}
                              className="w-full text-left px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                            >
                              + Maak "#{tagInput.trim()}"
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selected tags */}
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-lg font-medium ${getTagClasses(tag)}`}
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:opacity-70"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>

                {/* Bottom row: Project + buttons */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  {/* Project dropdown */}
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <select
                      value={projectPath}
                      onChange={(e) => setProjectPath(e.target.value)}
                      className="text-sm border-0 bg-transparent focus:ring-0 p-0 pr-6 text-gray-700 cursor-pointer"
                    >
                      <option value="">Inbox</option>
                      {todoProjectPaths.map((path) => (
                        <option key={path} value={path}>
                          {formatProjectLabel(path)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Annuleren
                    </button>
                    <button
                      type="submit"
                      disabled={!text.trim() || isCreating}
                      className="px-4 py-1.5 text-sm font-medium text-white bg-red-400 rounded-lg hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isCreating ? '...' : 'Taak toevoegen'}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Keyboard hint */}
            <div className="mt-2 text-center pointer-events-auto">
              <span className="text-xs text-gray-400">
                Druk <kbd className="px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded text-xs">Esc</kbd> om te sluiten
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
