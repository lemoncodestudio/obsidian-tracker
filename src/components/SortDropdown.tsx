import { useTicketStore } from '@/stores/ticketStore'
import type { SortOption } from '@/types/ticket'

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'priority', label: 'Priority' },
  { value: 'updated', label: 'Last updated' },
  { value: 'created', label: 'Created' },
  { value: 'title', label: 'Title' },
  { value: 'dueDate', label: 'Due date' },
]

export function SortDropdown() {
  const { sortBy, setSortBy } = useTicketStore()

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-500">Sort:</label>
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as SortOption)}
        className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
      >
        {sortOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
