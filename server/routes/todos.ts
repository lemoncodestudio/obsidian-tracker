import { Router } from 'express'
import path from 'path'
import {
  scanVaultForTodos,
  getTodoProjects,
  getTodoProjectPaths,
  updateTodoCompletion,
  createTodo,
} from '../lib/todoParser'

const router = Router()

// Get vault path from environment
const VAULT_PATH = process.env.VAULT_PATH || path.join(process.cwd(), 'vault')

// GET /api/todos - List all todos from vault
router.get('/', async (_req, res) => {
  try {
    const todos = await scanVaultForTodos(VAULT_PATH)
    res.json(todos)
  } catch (error) {
    console.error('Error fetching todos:', error)
    res.status(500).json({ message: 'Failed to fetch todos' })
  }
})

// POST /api/todos - Create a new todo
router.post('/', async (req, res) => {
  try {
    const { text, projectPath, dueDate, priority, tags } = req.body

    if (!text?.trim()) {
      return res.status(400).json({ message: 'text is required' })
    }

    const todo = await createTodo(VAULT_PATH, {
      text: text.trim(),
      projectPath,
      dueDate,
      priority,
      tags,
    })

    res.status(201).json(todo)
  } catch (error) {
    console.error('Error creating todo:', error)
    res.status(500).json({ message: 'Failed to create todo' })
  }
})

// PUT /api/todos/:id - Toggle todo completion
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { completed } = req.body

    if (typeof completed !== 'boolean') {
      return res.status(400).json({ message: 'completed field is required and must be a boolean' })
    }

    const updatedTodo = await updateTodoCompletion(VAULT_PATH, id, completed)

    if (!updatedTodo) {
      return res.status(404).json({ message: 'Todo not found' })
    }

    res.json(updatedTodo)
  } catch (error) {
    console.error('Error updating todo:', error)
    res.status(500).json({ message: 'Failed to update todo' })
  }
})

// GET /api/todos/projects - List unique projects from todos
router.get('/projects', async (_req, res) => {
  try {
    const projects = await getTodoProjects(VAULT_PATH)
    res.json(projects)
  } catch (error) {
    console.error('Error fetching todo projects:', error)
    res.status(500).json({ message: 'Failed to fetch todo projects' })
  }
})

// GET /api/todos/project-paths - List unique project paths from todos (with PARA categories)
router.get('/project-paths', async (_req, res) => {
  try {
    const projectPaths = await getTodoProjectPaths(VAULT_PATH)
    res.json(projectPaths)
  } catch (error) {
    console.error('Error fetching todo project paths:', error)
    res.status(500).json({ message: 'Failed to fetch todo project paths' })
  }
})

export default router
