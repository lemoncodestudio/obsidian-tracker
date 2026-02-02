import matter from 'gray-matter'
import type { Ticket, TicketStatus, TicketPriority } from '../../src/types/ticket'

interface TicketFrontmatter {
  id?: string
  status?: TicketStatus
  priority?: TicketPriority
  tags?: string[]
  created?: string
  updated?: string
  dueDate?: string
  project?: string
  archivedAt?: string
  order?: number
}

const DEFAULT_STATUS: TicketStatus = 'todo'
const DEFAULT_PRIORITY: TicketPriority = 'medium'

export function parseTicketMarkdown(content: string, filename: string): Ticket {
  const { data, content: body } = matter(content)
  const frontmatter = data as TicketFrontmatter

  // Extract title from first heading or filename
  const titleMatch = body.match(/^#\s+(.+)$/m)
  const title = titleMatch ? titleMatch[1].trim() : filename.replace(/\.md$/, '')

  // Extract source if present
  const sourceMatch = body.match(/\*\*Bron:\*\*\s*(.+)/i) || body.match(/\*\*Source:\*\*\s*(.+)/i)
  const source = sourceMatch ? sourceMatch[1].trim() : undefined

  // Extract description section
  const descriptionMatch = body.match(/##\s*(?:Beschrijving|Description)\s*\n([\s\S]*?)(?=\n##|$)/i)
  const description = descriptionMatch ? descriptionMatch[1].trim() : undefined

  // Extract acceptance criteria
  const criteriaMatch = body.match(/##\s*(?:Acceptatiecriteria|Acceptance\s*Criteria)\s*\n([\s\S]*?)(?=\n##|$)/i)
  let acceptanceCriteria: string[] | undefined
  if (criteriaMatch) {
    const criteriaText = criteriaMatch[1]
    acceptanceCriteria = criteriaText
      .split('\n')
      .filter(line => line.match(/^-\s*\[[ x]\]/i))
      .map(line => line.replace(/^-\s*\[[ x]\]\s*/i, '').trim())
      .filter(Boolean)
  }

  const now = new Date().toISOString()

  // Convert Date objects to strings if needed (preserves time if present)
  const formatDateTime = (date: string | Date | undefined): string => {
    if (!date) return now
    if (date instanceof Date) return date.toISOString()
    return date
  }

  const formatOptionalDate = (date: string | Date | undefined): string | undefined => {
    if (!date) return undefined
    if (date instanceof Date) return date.toISOString().split('T')[0]
    return date
  }

  // Get ID from frontmatter or generate new one
  const id = frontmatter.id || generateId()

  return {
    id,
    filename,
    title,
    status: frontmatter.status || DEFAULT_STATUS,
    priority: frontmatter.priority || DEFAULT_PRIORITY,
    tags: frontmatter.tags || [],
    created: formatDateTime(frontmatter.created),
    updated: formatDateTime(frontmatter.updated),
    dueDate: formatOptionalDate(frontmatter.dueDate),
    project: frontmatter.project,
    source,
    description,
    acceptanceCriteria,
    body: body.trim(),
    order: frontmatter.order,
  }
}

export function serializeTicketMarkdown(ticket: Partial<Ticket> & { title: string }): string {
  const now = new Date().toISOString()

  const frontmatter: TicketFrontmatter = {
    id: ticket.id || generateId(),
    status: ticket.status || DEFAULT_STATUS,
    priority: ticket.priority || DEFAULT_PRIORITY,
    tags: ticket.tags || [],
    created: ticket.created || now,
    updated: now,
  }

  // Only add dueDate if it's defined (YAML can't serialize undefined)
  if (ticket.dueDate) {
    frontmatter.dueDate = ticket.dueDate
  }

  // Only add project if it's defined (YAML can't serialize undefined)
  if (ticket.project) {
    frontmatter.project = ticket.project
  }

  // Only add order if it's defined
  if (ticket.order !== undefined) {
    frontmatter.order = ticket.order
  }

  let body = `# ${ticket.title}\n`

  if (ticket.source) {
    body += `\n**Bron:** ${ticket.source}\n`
  }

  if (ticket.description) {
    body += `\n## Beschrijving\n${ticket.description}\n`
  }

  if (ticket.acceptanceCriteria && ticket.acceptanceCriteria.length > 0) {
    body += `\n## Acceptatiecriteria\n`
    body += ticket.acceptanceCriteria.map(c => `- [ ] ${c}`).join('\n')
    body += '\n'
  }

  return matter.stringify(body, frontmatter)
}

interface TicketUpdates extends Partial<Ticket> {
  archivedAt?: string
  project?: string | null
  order?: number
}

export function updateTicketMarkdown(
  existingContent: string,
  updates: TicketUpdates
): string {
  const { data, content: body } = matter(existingContent)
  const frontmatter = data as TicketFrontmatter
  const now = new Date().toISOString()

  // Update frontmatter
  const newFrontmatter: TicketFrontmatter = {
    ...frontmatter,
    updated: now,
  }

  if (updates.status !== undefined) newFrontmatter.status = updates.status
  if (updates.priority !== undefined) newFrontmatter.priority = updates.priority
  if (updates.tags !== undefined) newFrontmatter.tags = updates.tags
  if (updates.archivedAt !== undefined) newFrontmatter.archivedAt = updates.archivedAt
  if (updates.dueDate !== undefined) {
    if (updates.dueDate === null) {
      delete newFrontmatter.dueDate
    } else {
      newFrontmatter.dueDate = updates.dueDate
    }
  }
  if (updates.project !== undefined) {
    if (updates.project === null || updates.project === '') {
      delete newFrontmatter.project
    } else {
      newFrontmatter.project = updates.project
    }
  }
  if (updates.order !== undefined) {
    newFrontmatter.order = updates.order
  }

  let newBody = body

  // Update title if changed
  if (updates.title !== undefined) {
    newBody = newBody.replace(/^#\s+.+$/m, `# ${updates.title}`)
  }

  // Update description if changed
  if (updates.description !== undefined) {
    const descriptionRegex = /(##\s*(?:Beschrijving|Description)\s*\n)([\s\S]*?)(?=\n##|$)/i
    if (descriptionRegex.test(newBody)) {
      newBody = newBody.replace(descriptionRegex, `$1${updates.description}\n`)
    } else {
      // Add description section if it doesn't exist
      const titleEndIndex = newBody.search(/\n/)
      const insertPoint = titleEndIndex !== -1 ? titleEndIndex + 1 : newBody.length
      newBody = newBody.slice(0, insertPoint) + `\n## Beschrijving\n${updates.description}\n` + newBody.slice(insertPoint)
    }
  }

  return matter.stringify(newBody, newFrontmatter)
}

export function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 10; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return id
}

export function generateFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
    + '.md'
}

export function ensureFrontmatter(content: string): { content: string; hadFrontmatter: boolean } {
  const { data } = matter(content)
  const hadFrontmatter = Object.keys(data).length > 0

  if (hadFrontmatter) {
    return { content, hadFrontmatter: true }
  }

  // Parse existing content to extract data
  const titleMatch = content.match(/^#\s+(.+)$/m)
  const title = titleMatch ? titleMatch[1].trim() : 'Untitled'

  const now = new Date().toISOString()
  const frontmatter: TicketFrontmatter = {
    id: generateId(),
    status: DEFAULT_STATUS,
    priority: DEFAULT_PRIORITY,
    tags: [],
    created: now,
    updated: now,
  }

  return {
    content: matter.stringify(content, frontmatter),
    hadFrontmatter: false,
  }
}
