import { motion } from 'framer-motion'
import { useTicketStore } from '@/stores/ticketStore'
import { getTagClasses } from '@/lib/tagColors'

export function TagFilter() {
  const { tags, selectedTags, toggleTag, clearSelectedTags } = useTicketStore()

  if (tags.length === 0) return null

  return (
    <div className="px-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tags</h3>
        {selectedTags.length > 0 && (
          <button
            onClick={clearSelectedTags}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <motion.button
            key={tag}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => toggleTag(tag)}
            className={`px-2 py-0.5 text-xs rounded-full transition-colors font-medium ${
              selectedTags.includes(tag)
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
