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

// Directories that are never vault projects
const EXCLUDED_DIRS = ['.obsidian', 'templates', 'node_modules', '.git', '.trash']

// Get backlog and archive paths for a specific vault project
function getBacklogPath(vaultProject: string): string {
  return path.join(VAULT_PATH, vaultProject, 'backlog')
}

function getArchivePath(vaultProject: string): string {
  return path.join(VAULT_PATH, vaultProject, 'backlog', 'archive')
}

// Discover all vault projects that have a backlog folder (recursive)
async function getVaultProjectsWithBacklogs(): Promise<string[]> {
  const projects: string[] = []

  async function scanForBacklogs(dirPath: string, relativePath: string = ''): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory() || EXCLUDED_DIRS.includes(entry.name)) {
        continue
      }

      const fullPath = path.join(dirPath, entry.name)
      const entryRelPath = relativePath ? path.join(relativePath, entry.name) : entry.name

      // Check for backlog subfolder
      const backlogPath = path.join(fullPath, 'backlog')
      try {
        const stat = await fs.stat(backlogPath)
        if (stat.isDirectory()) {
          projects.push(entryRelPath)
        }
      } catch {
        // No backlog folder
      }

      // Recursively scan deeper (except inside backlog folders)
      if (entry.name !== 'backlog') {
        await scanForBacklogs(fullPath, entryRelPath)
      }
    }
  }

  try {
    await scanForBacklogs(VAULT_PATH)
  } catch (error) {
    console.error('Error discovering vault projects:', error)
  }

  return projects.sort()
}

async function ensureDirectories(vaultProject: string): Promise<void> {
  await fs.mkdir(getBacklogPath(vaultProject), { recursive: true })
  await fs.mkdir(getArchivePath(vaultProject), { recursive: true })
}

// Find ticket file across all backlogs, returns { filename, vaultProject } or null
async function findTicketFile(id: string, vaultProject?: string): Promise<{ filename: string; vaultProject: string } | null> {
  const projectsToSearch = vaultProject
    ? [vaultProject]
    : await getVaultProjectsWithBacklogs()

  for (const project of projectsToSearch) {
    const backlogPath = getBacklogPath(project)
    try {
      const files = await fs.readdir(backlogPath)
      const mdFiles = files.filter((f) => f.endsWith('.md'))

      for (const filename of mdFiles) {
        const filepath = path.join(backlogPath, filename)
        const content = await fs.readFile(filepath, 'utf-8')
        const ticket = parseTicketMarkdown(content, filename, project)
        if (ticket.id === id) {
          return { filename, vaultProject: project }
        }
      }
    } catch {
      // Backlog doesn't exist, continue
    }
  }
  return null
}

// GET /api/backlogs - List all vault projects that have backlogs
router.get('/backlogs', async (_req: Request, res: Response) => {
  try {
    const projects = await getVaultProjectsWithBacklogs()
    res.json(projects)
  } catch (error) {
    console.error('Error listing backlogs:', error)
    res.status(500).json({ message: 'Failed to list backlogs' })
  }
})

// GET /api/tickets - List all tickets (optionally filtered by backlog)
router.get('/', async (req: Request, res: Response) => {
  try {
    const vaultProject = req.query.backlog as string | undefined

    // If backlog specified, only load from that backlog
    // Otherwise load from all backlogs
    const projectsToLoad = vaultProject
      ? [vaultProject]
      : await getVaultProjectsWithBacklogs()

    const allTickets = []

    for (const project of projectsToLoad) {
      await ensureDirectories(project)
      const backlogPath = getBacklogPath(project)

      try {
        const files = await fs.readdir(backlogPath)
        const mdFiles = files.filter((f) => f.endsWith('.md'))

        const tickets = await Promise.all(
          mdFiles.map(async (filename) => {
            const filepath = path.join(backlogPath, filename)
            const content = await fs.readFile(filepath, 'utf-8')

            // Migrate files without frontmatter
            const { content: migratedContent, hadFrontmatter } = ensureFrontmatter(content)
            if (!hadFrontmatter) {
              await fs.writeFile(filepath, migratedContent, 'utf-8')
            }

            return parseTicketMarkdown(migratedContent, filename, project)
          })
        )

        allTickets.push(...tickets)
      } catch {
        // Backlog doesn't exist, skip
      }
    }

    res.json(allTickets)
  } catch (error) {
    console.error('Error listing tickets:', error)
    res.status(500).json({ message: 'Failed to list tickets' })
  }
})

// GET /api/tickets/:id - Get single ticket
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await findTicketFile(req.params.id)
    if (!result) {
      res.status(404).json({ message: 'Ticket not found' })
      return
    }
    const { filename, vaultProject } = result
    const filepath = path.join(getBacklogPath(vaultProject), filename)

    const content = await fs.readFile(filepath, 'utf-8')
    const ticket = parseTicketMarkdown(content, filename, vaultProject)

    res.json(ticket)
  } catch (error) {
    console.error('Error getting ticket:', error)
    res.status(500).json({ message: 'Failed to get ticket' })
  }
})

// POST /api/tickets - Create new ticket
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, status, priority, tags, label, source, description, acceptanceCriteria, backlog } = req.body

    if (!title || typeof title !== 'string') {
      res.status(400).json({ message: 'Title is required' })
      return
    }

    if (!backlog || typeof backlog !== 'string') {
      res.status(400).json({ message: 'Backlog is required' })
      return
    }

    await ensureDirectories(backlog)
    const backlogPath = getBacklogPath(backlog)

    const baseFilename = generateFilename(title)
    let filename = baseFilename
    let counter = 1

    // Ensure unique filename
    while (true) {
      try {
        await fs.access(path.join(backlogPath, filename))
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
      label,
      source,
      description,
      acceptanceCriteria,
    })

    const filepath = path.join(backlogPath, filename)
    await fs.writeFile(filepath, content, 'utf-8')

    const ticket = parseTicketMarkdown(content, filename, backlog)
    res.status(201).json(ticket)
  } catch (error) {
    console.error('Error creating ticket:', error)
    res.status(500).json({ message: 'Failed to create ticket' })
  }
})

// PUT /api/tickets/:id - Update ticket
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const result = await findTicketFile(req.params.id)
    if (!result) {
      res.status(404).json({ message: 'Ticket not found' })
      return
    }
    const { filename, vaultProject } = result
    const filepath = path.join(getBacklogPath(vaultProject), filename)

    const existingContent = await fs.readFile(filepath, 'utf-8')
    const updatedContent = updateTicketMarkdown(existingContent, req.body)

    await fs.writeFile(filepath, updatedContent, 'utf-8')

    const ticket = parseTicketMarkdown(updatedContent, filename, vaultProject)
    res.json(ticket)
  } catch (error) {
    console.error('Error updating ticket:', error)
    res.status(500).json({ message: 'Failed to update ticket' })
  }
})

// DELETE /api/tickets/:id - Archive ticket (move to archive folder within same backlog)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await findTicketFile(req.params.id)
    if (!result) {
      res.status(404).json({ message: 'Ticket not found' })
      return
    }
    const { filename, vaultProject } = result

    await ensureDirectories(vaultProject)

    const sourcePath = path.join(getBacklogPath(vaultProject), filename)
    const destPath = path.join(getArchivePath(vaultProject), filename)

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

// GET /api/tags - List all unique tags (optionally filtered by backlog)
router.get('/meta/tags', async (req: Request, res: Response) => {
  try {
    const vaultProject = req.query.backlog as string | undefined
    const projectsToLoad = vaultProject
      ? [vaultProject]
      : await getVaultProjectsWithBacklogs()

    const allTags = new Set<string>()

    for (const project of projectsToLoad) {
      const backlogPath = getBacklogPath(project)
      try {
        const files = await fs.readdir(backlogPath)
        const mdFiles = files.filter((f) => f.endsWith('.md'))

        await Promise.all(
          mdFiles.map(async (filename) => {
            const filepath = path.join(backlogPath, filename)
            const content = await fs.readFile(filepath, 'utf-8')
            const ticket = parseTicketMarkdown(content, filename, project)
            ticket.tags.forEach((tag) => allTags.add(tag))
          })
        )
      } catch {
        // Backlog doesn't exist, skip
      }
    }

    res.json(Array.from(allTags).sort())
  } catch (error) {
    console.error('Error listing tags:', error)
    res.status(500).json({ message: 'Failed to list tags' })
  }
})

// GET /api/labels - List all unique labels from tickets (optionally filtered by backlog)
router.get('/meta/labels', async (req: Request, res: Response) => {
  try {
    const vaultProject = req.query.backlog as string | undefined
    const projectsToLoad = vaultProject
      ? [vaultProject]
      : await getVaultProjectsWithBacklogs()

    const allLabels = new Set<string>()

    for (const project of projectsToLoad) {
      const backlogPath = getBacklogPath(project)
      try {
        const files = await fs.readdir(backlogPath)
        const mdFiles = files.filter((f) => f.endsWith('.md'))

        await Promise.all(
          mdFiles.map(async (filename) => {
            const filepath = path.join(backlogPath, filename)
            const content = await fs.readFile(filepath, 'utf-8')
            const ticket = parseTicketMarkdown(content, filename, project)
            if (ticket.label) {
              allLabels.add(ticket.label)
            }
          })
        )
      } catch {
        // Backlog doesn't exist, skip
      }
    }

    res.json(Array.from(allLabels).sort())
  } catch (error) {
    console.error('Error listing labels:', error)
    res.status(500).json({ message: 'Failed to list labels' })
  }
})

export default router
