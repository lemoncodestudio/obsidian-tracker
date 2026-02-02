import { motion } from 'framer-motion'
import { useTicketStore } from '@/stores/ticketStore'
import type { DisplayMode } from '@/types/ticket'

export function ViewToggle() {
  const { displayMode, setDisplayMode } = useTicketStore()

  const options: { id: DisplayMode; label: string; icon: JSX.Element }[] = [
    {
      id: 'list',
      label: 'List',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
    {
      id: 'board',
      label: 'Board',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      ),
    },
  ]

  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
      {options.map((option) => (
        <motion.button
          key={option.id}
          onClick={() => setDisplayMode(option.id)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
            displayMode === option.id
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {option.icon}
          <span className="hidden sm:inline">{option.label}</span>
        </motion.button>
      ))}
    </div>
  )
}
