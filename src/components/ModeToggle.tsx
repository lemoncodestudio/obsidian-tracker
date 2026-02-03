import { motion } from 'framer-motion'
import { useTicketStore, type AppMode } from '@/stores/ticketStore'

const modes: { id: AppMode; label: string; icon: string }[] = [
  { id: 'tickets', label: 'Tickets', icon: '🎫' },
  { id: 'todos', label: 'Todos', icon: '☑️' },
]

export function ModeToggle() {
  const { mode, setMode } = useTicketStore()

  return (
    <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
      {modes.map((m) => (
        <motion.button
          key={m.id}
          onClick={() => setMode(m.id)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            mode === m.id
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>{m.icon}</span>
          <span>{m.label}</span>
        </motion.button>
      ))}
    </div>
  )
}
