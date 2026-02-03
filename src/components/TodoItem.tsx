import { motion } from 'framer-motion'
import { useTicketStore } from '@/stores/ticketStore'
import { getTagClasses } from '@/lib/tagColors'
import type { Todo } from '@/types/todo'

interface TodoItemProps {
  todo: Todo
  showSubtasks?: boolean
  allTodos?: Todo[]
}

const priorityColors: Record<string, string> = {
  urgent: 'text-red-600',
  high: 'text-orange-600',
  medium: 'text-yellow-600',
  low: 'text-gray-400',
}

const priorityLabels: Record<string, string> = {
  urgent: '!!',
  high: '!',
  medium: '',
  low: '',
}

// Parse date string as local date (not UTC) to avoid timezone issues
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function isOverdue(dueDate: string | undefined, completed: boolean): boolean {
  if (!dueDate || completed) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = parseLocalDate(dueDate)
  return due < today
}

function isDueSoon(dueDate: string | undefined, completed: boolean): boolean {
  if (!dueDate || completed) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = parseLocalDate(dueDate)
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays >= 0 && diffDays <= 2
}

function formatDueDate(dueDate: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = parseLocalDate(dueDate)
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays <= 7) return `${diffDays}d`
  return dueDate
}

function getObsidianDeeplink(filePath: string): string {
  // Get vault name from VAULT_PATH environment variable or use default
  // Since we're in frontend, we'll extract vault name from the file path
  // The vault path is configured on the backend, so we'll use a simplified approach
  const vaultName = 'inviplay' // This should match your VAULT_PATH setting
  const encodedPath = encodeURIComponent(filePath.replace(/\.md$/, ''))
  return `obsidian://open?vault=${vaultName}&file=${encodedPath}`
}

export function TodoItem({ todo, showSubtasks = true, allTodos = [] }: TodoItemProps) {
  const { selectedTodoId, selectTodo, toggleTodo } = useTicketStore()
  const isSelected = selectedTodoId === todo.id
  const overdue = isOverdue(todo.dueDate, todo.completed)
  const dueSoon = isDueSoon(todo.dueDate, todo.completed)

  // Find subtasks (todos that have this todo as parent)
  const subtasks = showSubtasks
    ? allTodos.filter(t => t.parentId === todo.id)
    : []

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await toggleTodo(todo.id)
  }

  const handleOpenInObsidian = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(getObsidianDeeplink(todo.filePath), '_blank')
  }

  // Calculate indentation padding based on level
  const indentPadding = todo.indentLevel > 0 ? `${todo.indentLevel * 1.5}rem` : '0'

  return (
    <div style={{ paddingLeft: indentPadding }}>
      <motion.div
        onClick={() => selectTodo(isSelected ? null : todo.id)}
        whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}
        className={`px-4 py-2.5 cursor-pointer transition-colors rounded-lg ${
          isSelected ? 'bg-blue-50' : ''
        } ${overdue ? 'bg-red-50' : ''}`}
      >
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            onClick={handleToggle}
            className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
              todo.completed
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            {todo.completed && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {/* Priority indicator */}
              {todo.priority && (todo.priority === 'urgent' || todo.priority === 'high') && (
                <span className={`text-xs font-bold ${priorityColors[todo.priority]}`}>
                  {priorityLabels[todo.priority]}
                </span>
              )}

              {/* Todo text */}
              <span className={`text-sm ${
                todo.completed ? 'text-gray-400 line-through' : 'text-gray-800'
              }`}>
                {todo.text}
              </span>
            </div>

            {/* Description (truncated) */}
            {todo.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                {todo.description.length > 80
                  ? todo.description.slice(0, 80) + '…'
                  : todo.description}
              </p>
            )}

            {/* Metadata row */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {/* Label (project/folder) - hide "geen" */}
              {todo.project && todo.project !== 'geen' && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  {todo.project}
                </span>
              )}

              {/* Due date */}
              {todo.dueDate && (
                <>
                  {todo.project && todo.project !== 'geen' && <span className="text-gray-300">·</span>}
                  <span className={`text-xs flex items-center gap-1 ${
                    overdue ? 'text-red-600 font-medium' : dueSoon ? 'text-orange-600' : 'text-gray-400'
                  }`}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDueDate(todo.dueDate)}
                  </span>
                </>
              )}

              {/* Tags */}
              {todo.tags && todo.tags.length > 0 && (
                <>
                  {((todo.project && todo.project !== 'geen') || todo.dueDate) && <span className="text-gray-300">·</span>}
                  <div className="flex gap-1">
                    {todo.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className={`px-1.5 py-0.5 text-xs rounded font-medium ${getTagClasses(tag)}`}
                      >
                        {tag}
                      </span>
                    ))}
                    {todo.tags.length > 3 && (
                      <span className="text-xs text-gray-400">+{todo.tags.length - 3}</span>
                    )}
                  </div>
                </>
              )}

              {/* File link */}
              {((todo.project && todo.project !== 'geen') || todo.dueDate || (todo.tags && todo.tags.length > 0)) && (
                <span className="text-gray-300">·</span>
              )}
              <button
                onClick={handleOpenInObsidian}
                className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                title={`Open ${todo.fileName} in Obsidian`}
              >
                <span className="truncate max-w-32">{todo.fileName}</span>
                <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Render subtasks */}
      {subtasks.length > 0 && (
        <div className="border-l-2 border-gray-100 ml-2">
          {subtasks.map(subtask => (
            <TodoItem
              key={subtask.id}
              todo={subtask}
              showSubtasks={showSubtasks}
              allTodos={allTodos}
            />
          ))}
        </div>
      )}
    </div>
  )
}
