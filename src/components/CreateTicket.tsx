import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTicketStore } from '@/stores/ticketStore'

export function CreateTicket() {
  const [title, setTitle] = useState('')
  const [label, setLabel] = useState('')
  const [showLabelInput, setShowLabelInput] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const { createTicket, labels, selectedLabel } = useTicketStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsCreating(true)
    try {
      // Use selectedLabel if it's a specific label (not null or empty string for "Loose")
      const ticketLabel = label.trim() || (selectedLabel && selectedLabel !== '' ? selectedLabel : undefined)
      await createTicket({
        title: title.trim(),
        status: 'todo',
        priority: 'medium',
        tags: [],
        label: ticketLabel,
      })
      setTitle('')
      setLabel('')
      setShowLabelInput(false)
    } catch (error) {
      console.error('Failed to create ticket:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-3">
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="w-5 h-5 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center"
        >
          <span className="text-gray-400 text-xs">+</span>
        </motion.div>
        <input
          id="new-ticket-input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a new ticket..."
          disabled={isCreating}
          className="flex-1 text-sm border-0 focus:ring-0 p-0 placeholder-gray-400 disabled:opacity-50"
        />
        {title.trim() && (
          <>
            <button
              type="button"
              onClick={() => setShowLabelInput(!showLabelInput)}
              className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                label || (selectedLabel && selectedLabel !== '')
                  ? 'border-blue-300 text-blue-600 bg-blue-50'
                  : 'border-gray-200 text-gray-400 hover:border-gray-300'
              }`}
              title="Set label"
            >
              # {label || (selectedLabel && selectedLabel !== '' ? selectedLabel : 'Label')}
            </button>
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              type="submit"
              disabled={isCreating}
              className="px-3 py-1 text-xs font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {isCreating ? '...' : 'Add'}
            </motion.button>
          </>
        )}
      </div>
      {showLabelInput && title.trim() && (
        <div className="ml-8 mt-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label name..."
            list="label-suggestions"
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <datalist id="label-suggestions">
            {labels.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </div>
      )}
    </form>
  )
}
