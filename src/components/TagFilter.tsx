import { motion } from 'framer-motion'
import { useTicketStore } from '@/stores/ticketStore'
import { getTagClasses } from '@/lib/tagColors'

export function TagFilter() {
  const {
    mode,
    tags,
    selectedTags,
    toggleTag,
    clearSelectedTags,
    todoTags,
    selectedTodoTags,
    toggleTodoTag,
    clearSelectedTodoTags,
  } = useTicketStore()

  const currentTags = mode === 'tickets' ? tags : todoTags
  const currentSelectedTags = mode === 'tickets' ? selectedTags : selectedTodoTags
  const handleToggle = mode === 'tickets' ? toggleTag : toggleTodoTag
  const handleClear = mode === 'tickets' ? clearSelectedTags : clearSelectedTodoTags

  if (currentTags.length === 0) return null

  return (
    <div className="px-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tags</h3>
        {currentSelectedTags.length > 0 && (
          <button
            onClick={handleClear}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {currentTags.map((tag) => (
          <motion.button
            key={tag}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleToggle(tag)}
            className={`px-2 py-0.5 text-xs rounded-full transition-colors font-medium ${
              currentSelectedTags.includes(tag)
                ? 'ring-2 ring-blue-500 ring-offset-1 ' + getTagClasses(tag)
                : getTagClasses(tag) + ' hover:opacity-80'
            }`}
          >
            {tag}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
