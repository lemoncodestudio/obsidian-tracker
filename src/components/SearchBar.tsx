import { useEffect, useRef } from 'react'
import { useTicketStore } from '@/stores/ticketStore'

interface SearchBarProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = 'Search tickets...' }: SearchBarProps) {
  const { searchQuery, setSearchQuery } = useTicketStore()
  const inputRef = useRef<HTMLInputElement>(null)

  // Use props if provided, otherwise fall back to store
  const currentValue = value !== undefined ? value : searchQuery
  const handleChange = onChange || setSearchQuery

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
      // Escape to clear and blur
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        handleChange('')
        inputRef.current?.blur()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleChange])

  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={currentValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-16 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      />
      <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-xs text-gray-400 bg-gray-100 rounded">
        {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}K
      </kbd>
    </div>
  )
}
