import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTicketStore } from '@/stores/ticketStore'

export function CreateTicket() {
  const [title, setTitle] = useState('')
  const [project, setProject] = useState('')
  const [showProjectInput, setShowProjectInput] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const { createTicket, projects, selectedProject } = useTicketStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsCreating(true)
    try {
      // Use selectedProject if it's a specific project (not null or empty string for "Loose")
      const ticketProject = project.trim() || (selectedProject && selectedProject !== '' ? selectedProject : undefined)
      await createTicket({
        title: title.trim(),
        status: 'todo',
        priority: 'medium',
        tags: [],
        project: ticketProject,
      })
      setTitle('')
      setProject('')
      setShowProjectInput(false)
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
              onClick={() => setShowProjectInput(!showProjectInput)}
              className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                project || (selectedProject && selectedProject !== '')
                  ? 'border-blue-300 text-blue-600 bg-blue-50'
                  : 'border-gray-200 text-gray-400 hover:border-gray-300'
              }`}
              title="Set project"
            >
              # {project || (selectedProject && selectedProject !== '' ? selectedProject : 'Project')}
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
      {showProjectInput && title.trim() && (
        <div className="ml-8 mt-2">
          <input
            type="text"
            value={project}
            onChange={(e) => setProject(e.target.value)}
            placeholder="Project name..."
            list="project-suggestions"
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <datalist id="project-suggestions">
            {projects.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>
      )}
    </form>
  )
}
