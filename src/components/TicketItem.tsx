import { motion } from 'framer-motion'
import { useTicketStore } from '@/stores/ticketStore'
import { getTagClasses } from '@/lib/tagColors'
import type { Ticket, TicketStatus } from '@/types/ticket'

interface TicketItemProps {
  ticket: Ticket
  isDragging?: boolean
}

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-gray-300',
}

const statusLabels: Record<TicketStatus, string> = {
  'todo': 'To Do',
  'in-progress': 'In Progress',
  'done': 'Done',
}

function isOverdue(dueDate: string | undefined, status: TicketStatus): boolean {
  if (!dueDate || status === 'done') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  return due < today
}

function isDueSoon(dueDate: string | undefined, status: TicketStatus): boolean {
  if (!dueDate || status === 'done') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays >= 0 && diffDays <= 2
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

export function TicketItem({ ticket, isDragging }: TicketItemProps) {
  const { selectedTicketId, selectTicket, updateTicket } = useTicketStore()
  const isSelected = selectedTicketId === ticket.id
  const overdue = isOverdue(ticket.dueDate, ticket.status)
  const dueSoon = isDueSoon(ticket.dueDate, ticket.status)

  const handleStatusToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const nextStatus: Record<TicketStatus, TicketStatus> = {
      'todo': 'in-progress',
      'in-progress': 'done',
      'done': 'todo',
    }
    await updateTicket(ticket.id, { status: nextStatus[ticket.status] })
  }

  return (
    <motion.div
      onClick={() => selectTicket(isSelected ? null : ticket.id)}
      whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}
      className={`px-6 py-3 cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-50' : ''
      } ${overdue ? 'bg-red-50' : ''} ${isDragging ? 'opacity-90' : ''}`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={handleStatusToggle}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            ticket.status === 'done'
              ? 'bg-green-500 border-green-500 text-white'
              : ticket.status === 'in-progress'
              ? 'border-blue-500 bg-blue-100'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          {ticket.status === 'done' && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {ticket.status === 'in-progress' && (
            <div className="w-2 h-2 rounded-full bg-blue-500" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${priorityColors[ticket.priority]}`} />
            <h3 className={`text-sm font-medium truncate ${
              ticket.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-800'
            }`}>
              {ticket.title}
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400">{statusLabels[ticket.status]}</span>
            {ticket.dueDate && (
              <>
                <span className="text-gray-300">·</span>
                <span className={`text-xs flex items-center gap-1 ${
                  overdue ? 'text-red-600 font-medium' : dueSoon ? 'text-orange-600' : 'text-gray-400'
                }`}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDueDate(ticket.dueDate)}
                </span>
              </>
            )}
            {ticket.tags.length > 0 && (
              <>
                <span className="text-gray-300">·</span>
                <div className="flex gap-1">
                  {ticket.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className={`px-1.5 py-0.5 text-xs rounded font-medium ${getTagClasses(tag)}`}
                    >
                      {tag}
                    </span>
                  ))}
                  {ticket.tags.length > 3 && (
                    <span className="text-xs text-gray-400">+{ticket.tags.length - 3}</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <span className="text-xs text-gray-400 whitespace-nowrap">
          {formatRelativeTime(ticket.updated)}
        </span>
      </div>
    </motion.div>
  )
}
