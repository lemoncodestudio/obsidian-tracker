import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs/promises'
import ticketsRouter from './routes/tickets'
import { startWatcher } from './lib/watcher'
import { parseTicketMarkdown } from './lib/markdown'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Configurable vault path
const VAULT_PATH = process.env.VAULT_PATH || path.join(process.cwd(), 'vault')
const BACKLOG_PATH = path.join(VAULT_PATH, 'backlog')

// Tags route (before tickets to avoid conflict with :id param)
app.get('/api/tags', async (_req, res) => {
  try {
    const files = await fs.readdir(BACKLOG_PATH)
    const mdFiles = files.filter((f) => f.endsWith('.md'))

    const allTags = new Set<string>()

    await Promise.all(
      mdFiles.map(async (filename) => {
        const filepath = path.join(BACKLOG_PATH, filename)
        const content = await fs.readFile(filepath, 'utf-8')
        const ticket = parseTicketMarkdown(content, filename)
        ticket.tags.forEach((tag) => allTags.add(tag))
      })
    )

    res.json(Array.from(allTags).sort())
  } catch (error) {
    console.error('Error listing tags:', error)
    res.status(500).json({ message: 'Failed to list tags' })
  }
})

// Projects route
app.get('/api/projects', async (_req, res) => {
  try {
    const files = await fs.readdir(BACKLOG_PATH)
    const mdFiles = files.filter((f) => f.endsWith('.md'))

    const allProjects = new Set<string>()

    await Promise.all(
      mdFiles.map(async (filename) => {
        const filepath = path.join(BACKLOG_PATH, filename)
        const content = await fs.readFile(filepath, 'utf-8')
        const ticket = parseTicketMarkdown(content, filename)
        if (ticket.project) {
          allProjects.add(ticket.project)
        }
      })
    )

    res.json(Array.from(allProjects).sort())
  } catch (error) {
    console.error('Error listing projects:', error)
    res.status(500).json({ message: 'Failed to list projects' })
  }
})

// Routes
app.use('/api/tickets', ticketsRouter)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)

  // Start file watcher
  startWatcher(BACKLOG_PATH)
})
