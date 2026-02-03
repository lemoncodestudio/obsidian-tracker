import { useTicketStore } from '@/stores/ticketStore'
import { TodoItem } from './TodoItem'
import { SearchBar } from './SearchBar'
import type { TodoViewType } from '@/types/todo'

const viewLabels: Record<TodoViewType, string> = {
  all: 'All Todos',
  today: 'Today',
  upcoming: 'Upcoming',
  someday: 'Someday',
  done: 'Done',
}

export function TodoList() {
  const {
    todos,
    getFilteredTodos,
    isTodosLoading,
    todosError,
    activeTodoView,
    todoSearchQuery,
    setTodoSearchQuery,
  } = useTicketStore()

  const filteredTodos = getFilteredTodos()

  // Only show top-level todos (those without parents)
  // Subtasks will be rendered recursively by TodoItem
  const topLevelTodos = filteredTodos.filter(t => !t.parentId)

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <header className="px-6 py-4 border-b border-gray-200 bg-white space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-800">{viewLabels[activeTodoView]}</h2>
            <span className="text-sm text-gray-400">{filteredTodos.length} todos</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-md">
            <SearchBar
              value={todoSearchQuery}
              onChange={setTodoSearchQuery}
              placeholder="Search todos..."
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {isTodosLoading && filteredTodos.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-500" />
          </div>
        ) : todosError ? (
          <div className="p-6 text-center text-red-500">{todosError}</div>
        ) : topLevelTodos.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            {todoSearchQuery ? 'No todos match your search' : 'No todos found'}
          </div>
        ) : (
          <div className="space-y-1">
            {topLevelTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                showSubtasks={true}
                allTodos={todos}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
