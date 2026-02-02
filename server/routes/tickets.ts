import { Router, Request, Response } from 'express'
import fs from 'fs/promises'
import path from 'path'
import {
  parseTicketMarkdown,
  serializeTicketMarkdown,
  updateTicketMarkdown,
  generateFilename,
  ensureFrontmatter,
} from '../lib/markdown'

const router = Router()

// Configurable vault path - defaults to a test directory in the project
const VAULT_PATH = process.env.VAULT_PATH || path.join(process.cwd(), 'vault')
const BACKLOG_PATH = path.join(VAULT_PATH, 'backlog')
const ARCHIVE_PATH = path.join(VAULT_PATH, 'archive')

async function ensureDirectories(): Promise<void> {
  await fs.mkdir(BACKLOG_PATH, { recursive: true })
  await fs.mkdir(ARCHIVE_PATH, { recursive: true })
}

async function findTicketFile(id: string): Promise<string | null> {
  const files = await fs.readdir(BACKLOG_PATH)
  const mdFiles = files.filter((f) => f.endsWith('.md'))

  for (const filename of mdFiles) {
    const filepath = path.join(BACKLOG_PATH, filename)
    const content = await fs.readFile(filepath, 'utf-8')
    const ticket = parseTicketMarkdown(content, filename)
    if (ticket.id === id) {
      return filename
    }
  }
  return null
}

// GET /api/tickets - List all tickets
router.get('/', async (_req: Request, res: Response) => {
  try {
    await ensureDirectories()

    const files = await fs.readdir(BACKLOG_PATH)
    const mdFiles = files.filter((f) => f.endsWith('.md'))

    const tickets = await Promise.all(
      mdFiles.map(async (filename) => {
        const filepath = path.join(BACKLOG_PATH, filename)
        const content = await fs.readFile(filepath, 'utf-8')

        // Migrate files without frontmatter
        const { content: migratedContent, hadFrontmatter } = ensureFrontmatter(content)
        if (!hadFrontmatter) {
          await fs.writeFile(filepath, migratedContent, 'utf-8')
        }

        return parseTicketMarkdown(migratedContent, filename)
      })
    )

    res.json(tickets)
  } catch (error) {
    console.error('Error listing tickets:', error)
    res.status(500).json({ message: 'Failed to list tickets' })
  }
})

// GET /api/tickets/:id - Get single ticket
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const filename = await findTicketFile(req.params.id)
    if (!filename) {
      res.status(404).json({ message: 'Ticket not found' })
      return
    }
    const filepath = path.join(BACKLOG_PATH, filename)

    const content = await fs.readFile(filepath, 'utf-8')
    const ticket = parseTicketMarkdown(content, filename)

    res.json(ticket)
  } catch (error) {
    console.error('Error getting ticket:', error)
    res.status(500).json({ message: 'Failed to get ticket' })
  }
})

// POST /api/tickets - Create new ticket
router.post('/', async (req: Request, res: Response) => {
  try {
    await ensureDirectories()

    const { title, status, priority, tags, project, source, description, acceptanceCriteria } = req.body

    if (!title || typeof title !== 'string') {
      res.status(400).json({ message: 'Title is required' })
      return
    }

    const baseFilename = generateFilename(title)
    let filename = baseFilename
    let counter = 1

    // Ensure unique filename
    while (true) {
      try {
        await fs.access(path.join(BACKLOG_PATH, filename))
        filename = baseFilename.replace('.md', `-${counter}.md`)
        counter++
      } catch {
        break
      }
    }

    const content = serializeTicketMarkdown({
      title,
      status,
      priority,
      tags,
      project,
      source,
      description,
      acceptanceCriteria,
    })

    const filepath = path.join(BACKLOG_PATH, filename)
    await fs.writeFile(filepath, content, 'utf-8')

    const ticket = parseTicketMarkdown(content, filename)
    res.status(201).json(ticket)
  } catch (error) {
    console.error('Error creating ticket:', error)
    res.status(500).json({ message: 'Failed to create ticket' })
  }
})

// PUT /api/tickets/:id - Update ticket
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const filename = await findTicketFile(req.params.id)
    if (!filename) {
      res.status(404).json({ message: 'Ticket not found' })
      return
    }
    const filepath = path.join(BACKLOG_PATH, filename)

    const existingContent = await fs.readFile(filepath, 'utf-8')
    const updatedContent = updateTicketMarkdown(existingContent, req.body)

    await fs.writeFile(filepath, updatedContent, 'utf-8')

    const ticket = parseTicketMarkdown(updatedContent, filename)
    res.json(ticket)
  } catch (error) {
    console.error('Error updating ticket:', error)
    res.status(500).json({ message: 'Failed to update ticket' })
  }
})

// DELETE /api/tickets/:id - Archive ticket (move to archive folder)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await ensureDirectories()

    const filename = await findTicketFile(req.params.id)
    if (!filename) {
      res.status(404).json({ message: 'Ticket not found' })
      return
    }

    const sourcePath = path.join(BACKLOG_PATH, filename)
    const destPath = path.join(ARCHIVE_PATH, filename)

    // Read and update content with archivedAt
    const content = await fs.readFile(sourcePath, 'utf-8')
    const updatedContent = updateTicketMarkdown(content, { archivedAt: new Date().toISOString().split('T')[0] })

    // Write to archive and remove from backlog
    await fs.writeFile(destPath, updatedContent, 'utf-8')
    await fs.unlink(sourcePath)

    res.status(204).send()
  } catch (error) {
    console.error('Error archiving ticket:', error)
    res.status(500).json({ message: 'Failed to archive ticket' })
  }
})

// GET /api/tags - List all unique tags
router.get('/meta/tags', async (_req: Request, res: Response) => {
  try {
    await ensureDirectories()

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

// GET /api/projects - List all unique projects
router.get('/meta/projects', async (_req: Request, res: Response) => {
  try {
    await ensureDirectories()

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

export default router
