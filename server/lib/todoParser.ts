import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import type { Todo, TodoPriority } from '../../src/types/todo'

// Directories to exclude from scanning
// Note: 'backlog' is excluded at any level (project/backlog contains tickets, not todos)
const EXCLUDED_DIRS = [
  '.obsidian',
  'templates',
  'archive',
  'backlog',
  'node_modules',
  '.git',
  '.trash',
]

// Regex patterns for inline metadata
const DATE_PATTERN = /\((\d{4}-\d{2}-\d{2})\)/
const PRIORITY_PATTERN = /!(urgent|high|medium|low)/i
const TAG_PATTERN = /#([\w-]+)/g

// Pattern to detect daily notes (filename is YYYY-MM-DD.md)
const DAILY_NOTE_PATTERN = /^(\d{4}-\d{2}-\d{2})\.md$/

// Checkbox patterns
const TODO_UNCHECKED = /^(\s*)- \[ \] (.*)$/
const TODO_CHECKED = /^(\s*)- \[x\] (.*)$/i

function generateTodoId(filePath: string, lineNumber: number): string {
  const hash = crypto.createHash('md5')
  hash.update(`${filePath}:${lineNumber}`)
  return hash.digest('hex').slice(0, 10)
}

function parseInlineMetadata(text: string): {
  cleanText: string
  dueDate?: string
  priority?: TodoPriority
  tags?: string[]
} {
  let cleanText = text
  let dueDate: string | undefined
  let priority: TodoPriority | undefined
  const tags: string[] = []

  // Extract date (YYYY-MM-DD)
  const dateMatch = text.match(DATE_PATTERN)
  if (dateMatch) {
    dueDate = dateMatch[1]
    cleanText = cleanText.replace(DATE_PATTERN, '').trim()
  }

  // Extract priority
  const priorityMatch = text.match(PRIORITY_PATTERN)
  if (priorityMatch) {
    priority = priorityMatch[1].toLowerCase() as TodoPriority
    cleanText = cleanText.replace(PRIORITY_PATTERN, '').trim()
  }

  // Extract tags
  let tagMatch
  while ((tagMatch = TAG_PATTERN.exec(text)) !== null) {
    tags.push(tagMatch[1].toLowerCase())
    cleanText = cleanText.replace(tagMatch[0], '').trim()
  }

  // Clean up multiple spaces
  cleanText = cleanText.replace(/\s+/g, ' ').trim()

  return {
    cleanText,
    dueDate,
    priority,
    tags: tags.length > 0 ? tags.sort() : undefined,
  }
}

function getIndentLevel(indent: string): number {
  // Count spaces or tabs (2 spaces or 1 tab = 1 level)
  const spaces = indent.replace(/\t/g, '  ').length
  return Math.floor(spaces / 2)
}

// PARA top-level categories to skip when deriving project
const PARA_CATEGORIES = ['areas', 'projects', 'resources', 'archive']

interface ProjectInfo {
  project?: string
  projectPath?: string
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')      // spaces to dashes
    .replace(/[^\w-]/g, '')    // remove non-word chars except dashes
    .replace(/--+/g, '-')      // collapse multiple dashes
    .replace(/^-|-$/g, '')     // trim leading/trailing dashes
}

function deriveProjectInfo(filePath: string, vaultPath: string): ProjectInfo {
  const relativePath = path.relative(vaultPath, filePath)
  const parts = relativePath.split(path.sep)

  // If file is in root or only has filename, use "geen" label
  if (parts.length <= 1) {
    return { project: 'geen' }
  }

  // Remove filename, keep only folders
  const folders = parts.slice(0, -1)

  // Filter out PARA top-level categories to get meaningful project name
  const meaningful = folders.filter(f => !PARA_CATEGORIES.includes(f.toLowerCase()))

  // No meaningful folders (only PARA categories), use "geen" label
  if (meaningful.length === 0) {
    return { project: 'geen', projectPath: folders.join('/') }
  }

  // Use first 2 meaningful folders as label (slugified, joined by /)
  // projectPath is full folder path (for file operations)
  const labelParts = meaningful.slice(0, 2).map(slugify)
  return {
    project: labelParts.join('/'),
    projectPath: folders.join('/'),
  }
}

interface ParsedTodoLine {
  indent: string
  rawText: string
  completed: boolean
  lineNumber: number
  description?: string
}

function parseTodosFromContent(
  content: string,
  filePath: string,
  vaultPath: string,
  fileMtime: string
): Todo[] {
  const lines = content.split('\n')
  const todos: Todo[] = []
  const parsedLines: ParsedTodoLine[] = []

  // Check if this is a daily note (filename is YYYY-MM-DD.md)
  const fileName = path.basename(filePath)
  const dailyNoteMatch = fileName.match(DAILY_NOTE_PATTERN)
  const dailyNoteDate = dailyNoteMatch ? dailyNoteMatch[1] : undefined

  // Track if we're inside a code block
  let inCodeBlock = false
  let inFrontmatter = false
  let frontmatterCount = 0

  // Track which lines are valid content (not frontmatter, not code blocks)
  const validLines: { lineNumber: number; line: string; inCodeBlock: boolean }[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNumber = i + 1

    // Track frontmatter (only at start of file)
    if (i === 0 && line.trim() === '---') {
      inFrontmatter = true
      frontmatterCount = 1
      continue
    }
    if (inFrontmatter && line.trim() === '---') {
      frontmatterCount++
      if (frontmatterCount >= 2) {
        inFrontmatter = false
      }
      continue
    }
    if (inFrontmatter) continue

    // Track code blocks
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue

    validLines.push({ lineNumber, line, inCodeBlock })

    // Check for unchecked todo
    const uncheckedMatch = line.match(TODO_UNCHECKED)
    if (uncheckedMatch) {
      const rawText = uncheckedMatch[2].trim()
      // Skip empty todos
      if (!rawText) continue
      parsedLines.push({
        indent: uncheckedMatch[1],
        rawText: uncheckedMatch[2],
        completed: false,
        lineNumber,
      })
      continue
    }

    // Check for checked todo
    const checkedMatch = line.match(TODO_CHECKED)
    if (checkedMatch) {
      const rawText = checkedMatch[2].trim()
      // Skip empty todos
      if (!rawText) continue
      parsedLines.push({
        indent: checkedMatch[1],
        rawText: checkedMatch[2],
        completed: true,
        lineNumber,
      })
    }
  }

  // Second pass: collect description lines for each todo
  for (const parsedLine of parsedLines) {
    const todoIndentLevel = getIndentLevel(parsedLine.indent)
    const descriptionLines: string[] = []

    // Find the index in validLines where this todo is
    const todoValidIndex = validLines.findIndex(v => v.lineNumber === parsedLine.lineNumber)
    if (todoValidIndex === -1) continue

    // Look at subsequent lines
    for (let i = todoValidIndex + 1; i < validLines.length; i++) {
      const nextLine = validLines[i].line

      // Skip empty lines but continue looking
      if (nextLine.trim() === '') {
        // If we already have description lines, empty line ends the description
        if (descriptionLines.length > 0) break
        continue
      }

      // Check if this is a checkbox (another todo) - stop collecting
      if (TODO_UNCHECKED.test(nextLine) || TODO_CHECKED.test(nextLine)) {
        break
      }

      // Get the indentation of this line
      const lineIndentMatch = nextLine.match(/^(\s*)/)
      const lineIndent = lineIndentMatch ? lineIndentMatch[1] : ''
      const lineIndentLevel = getIndentLevel(lineIndent)

      // Description lines must be MORE indented than the todo
      if (lineIndentLevel <= todoIndentLevel) {
        break
      }

      // This is a description line - remove the base indentation
      const trimmedLine = nextLine.trim()
      descriptionLines.push(trimmedLine)
    }

    if (descriptionLines.length > 0) {
      parsedLine.description = descriptionLines.join('\n')
    }
  }

  // Now process parsed lines to build hierarchy
  const fileNameWithoutExt = path.basename(filePath, '.md')
  const relativePath = path.relative(vaultPath, filePath)
  const { project, projectPath } = deriveProjectInfo(filePath, vaultPath)

  // Stack to track parent todos at each indent level
  const parentStack: { id: string; indentLevel: number }[] = []

  for (const parsedLine of parsedLines) {
    const indentLevel = getIndentLevel(parsedLine.indent)
    const id = generateTodoId(relativePath, parsedLine.lineNumber)
    const { cleanText, dueDate, priority, tags } = parseInlineMetadata(parsedLine.rawText)

    // Find parent by looking at indent levels
    while (
      parentStack.length > 0 &&
      parentStack[parentStack.length - 1].indentLevel >= indentLevel
    ) {
      parentStack.pop()
    }

    const parentId = parentStack.length > 0
      ? parentStack[parentStack.length - 1].id
      : undefined

    // Use daily note date as fallback if no explicit due date
    const effectiveDueDate = dueDate || dailyNoteDate

    const todo: Todo = {
      id,
      text: cleanText,
      rawText: parsedLine.rawText,
      description: parsedLine.description,
      completed: parsedLine.completed,
      filePath: relativePath,
      fileName: fileNameWithoutExt,
      lineNumber: parsedLine.lineNumber,
      indentLevel,
      parentId,
      project,
      projectPath,
      dueDate: effectiveDueDate,
      priority,
      tags,
      created: fileMtime,
    }

    todos.push(todo)

    // Push to parent stack for potential children
    parentStack.push({ id, indentLevel })
  }

  return todos
}

async function scanDirectory(
  dirPath: string,
  vaultPath: string,
  todos: Todo[]
): Promise<void> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      // Skip excluded directories
      if (EXCLUDED_DIRS.includes(entry.name)) {
        continue
      }
      await scanDirectory(fullPath, vaultPath, todos)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      try {
        const content = await fs.readFile(fullPath, 'utf-8')
        const stats = await fs.stat(fullPath)
        const fileTodos = parseTodosFromContent(
          content,
          fullPath,
          vaultPath,
          stats.mtime.toISOString()
        )
        todos.push(...fileTodos)
      } catch (error) {
        console.error(`Error reading file ${fullPath}:`, error)
      }
    }
  }
}

export async function scanVaultForTodos(vaultPath: string): Promise<Todo[]> {
  const todos: Todo[] = []

  try {
    await scanDirectory(vaultPath, vaultPath, todos)
  } catch (error) {
    console.error('Error scanning vault for todos:', error)
  }

  return todos
}

export async function getTodoProjects(vaultPath: string): Promise<string[]> {
  const todos = await scanVaultForTodos(vaultPath)
  const projects = new Set<string>()

  for (const todo of todos) {
    if (todo.project) {
      projects.add(todo.project)
    }
  }

  return Array.from(projects).sort()
}

export function getTodoById(todos: Todo[], id: string): Todo | undefined {
  return todos.find(t => t.id === id)
}

interface TodoUpdateData {
  text?: string
  description?: string | null
  completed?: boolean
  dueDate?: string | null
  priority?: TodoPriority | null
  tags?: string[]
}

function formatTodoLine(
  text: string,
  completed: boolean,
  indent: string,
  tags?: string[],
  priority?: TodoPriority | null,
  dueDate?: string | null
): string {
  const checkbox = completed ? '- [x]' : '- [ ]'
  let line = `${indent}${checkbox} ${text}`

  if (tags && tags.length > 0) {
    line += ` ${tags.map(t => `#${t}`).join(' ')}`
  }
  if (priority) {
    line += ` !${priority}`
  }
  if (dueDate) {
    line += ` (${dueDate})`
  }

  return line
}

export async function updateTodo(
  vaultPath: string,
  todoId: string,
  data: TodoUpdateData
): Promise<Todo | null> {
  // First, find the todo to get its file path and line number
  const todos = await scanVaultForTodos(vaultPath)
  const todo = todos.find(t => t.id === todoId)

  if (!todo) {
    return null
  }

  const fullPath = path.join(vaultPath, todo.filePath)
  const content = await fs.readFile(fullPath, 'utf-8')
  const lines = content.split('\n')

  const lineIndex = todo.lineNumber - 1
  if (lineIndex < 0 || lineIndex >= lines.length) {
    throw new Error('Line number out of range')
  }

  // Get the current line's indentation
  const currentLine = lines[lineIndex]
  const indentMatch = currentLine.match(/^(\s*)/)
  const indent = indentMatch ? indentMatch[1] : ''

  // Determine new values (use existing if not provided)
  const newText = data.text !== undefined ? data.text : todo.text
  const newCompleted = data.completed !== undefined ? data.completed : todo.completed
  const newTags = data.tags !== undefined ? data.tags : todo.tags
  const newPriority = data.priority !== undefined ? data.priority : todo.priority
  const newDueDate = data.dueDate !== undefined ? data.dueDate : todo.dueDate

  // Format the new todo line
  const newLine = formatTodoLine(newText, newCompleted, indent, newTags, newPriority, newDueDate)
  lines[lineIndex] = newLine

  // Handle description update
  // First, find and remove existing description lines
  const todoIndentLevel = indent.replace(/\t/g, '  ').length / 2
  let descEndIndex = lineIndex + 1

  while (descEndIndex < lines.length) {
    const nextLine = lines[descEndIndex]

    // Empty line ends description
    if (nextLine.trim() === '') {
      break
    }

    // Checkbox ends description
    if (TODO_UNCHECKED.test(nextLine) || TODO_CHECKED.test(nextLine)) {
      break
    }

    // Check indentation
    const nextIndentMatch = nextLine.match(/^(\s*)/)
    const nextIndent = nextIndentMatch ? nextIndentMatch[1] : ''
    const nextIndentLevel = nextIndent.replace(/\t/g, '  ').length / 2

    // Less or equal indentation ends description
    if (nextIndentLevel <= todoIndentLevel) {
      break
    }

    descEndIndex++
  }

  // Remove old description lines
  const descriptionLineCount = descEndIndex - lineIndex - 1
  if (descriptionLineCount > 0) {
    lines.splice(lineIndex + 1, descriptionLineCount)
  }

  // Add new description lines if provided
  if (data.description !== undefined && data.description !== null && data.description.trim()) {
    const descIndent = indent + '  ' // 2 spaces more than todo
    const descLines = data.description.split('\n').map(line => descIndent + line.trim())
    lines.splice(lineIndex + 1, 0, ...descLines)
  }

  await fs.writeFile(fullPath, lines.join('\n'), 'utf-8')

  // Re-scan to get the updated todo with correct data
  const updatedTodos = await scanVaultForTodos(vaultPath)
  return updatedTodos.find(t => t.id === todoId) || null
}

export async function getTodoProjectPaths(vaultPath: string): Promise<string[]> {
  const todos = await scanVaultForTodos(vaultPath)
  const paths = new Set<string>()

  for (const todo of todos) {
    if (todo.projectPath) {
      paths.add(todo.projectPath)
    }
  }

  return Array.from(paths).sort()
}

interface TodoCreateData {
  text: string
  projectPath?: string
  dueDate?: string
  priority?: TodoPriority
  tags?: string[]
}

export async function createTodo(
  vaultPath: string,
  data: TodoCreateData
): Promise<Todo> {
  // 1. Determine target file
  let targetFile: string
  if (data.projectPath && data.dueDate) {
    targetFile = path.join(data.projectPath, `${data.dueDate}.md`)
  } else if (data.projectPath) {
    targetFile = path.join(data.projectPath, 'inbox.md')
  } else if (data.dueDate) {
    targetFile = `${data.dueDate}.md`
  } else {
    targetFile = 'inbox.md'
  }

  // 2. Format todo line
  let line = `- [ ] ${data.text}`
  if (data.tags?.length) {
    line += ` ${data.tags.map(t => `#${t}`).join(' ')}`
  }
  if (data.priority) {
    line += ` !${data.priority}`
  }
  // Only add date if NOT in a daily note (to avoid redundancy)
  const isDailyNote = DAILY_NOTE_PATTERN.test(path.basename(targetFile))
  if (data.dueDate && !isDailyNote) {
    line += ` (${data.dueDate})`
  }

  // 3. Append to file (create if needed)
  const fullPath = path.join(vaultPath, targetFile)
  await fs.mkdir(path.dirname(fullPath), { recursive: true })

  let content = ''
  try {
    content = await fs.readFile(fullPath, 'utf-8')
  } catch {
    // File doesn't exist, will be created
  }

  // Append todo line
  const newContent = content ? `${content.trimEnd()}\n${line}` : line
  await fs.writeFile(fullPath, newContent, 'utf-8')

  // 4. Re-parse to get todo with generated ID
  const todos = await scanVaultForTodos(vaultPath)
  const createdTodo = todos.find(t => t.filePath === targetFile && t.text === data.text)

  if (!createdTodo) {
    throw new Error('Failed to find created todo')
  }

  return createdTodo
}
