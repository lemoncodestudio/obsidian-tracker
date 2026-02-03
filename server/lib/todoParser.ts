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

function deriveProjectInfo(filePath: string, vaultPath: string): ProjectInfo {
  const relativePath = path.relative(vaultPath, filePath)
  const parts = relativePath.split(path.sep)

  // If file is in root or only has filename, no project
  if (parts.length <= 1) {
    return {}
  }

  // Remove filename, keep only folders
  const folders = parts.slice(0, -1)

  // Filter out PARA top-level categories to get meaningful project name
  const meaningful = folders.filter(f => !PARA_CATEGORIES.includes(f.toLowerCase()))

  if (meaningful.length === 0) {
    return {}
  }

  // Use last meaningful folder as project display name
  // projectPath is full folder path (for file operations)
  return {
    project: meaningful[meaningful.length - 1],
    projectPath: folders.join('/'),
  }
}

interface ParsedTodoLine {
  indent: string
  rawText: string
  completed: boolean
  lineNumber: number
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

    // Check for unchecked todo
    const uncheckedMatch = line.match(TODO_UNCHECKED)
    if (uncheckedMatch) {
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
      parsedLines.push({
        indent: checkedMatch[1],
        rawText: checkedMatch[2],
        completed: true,
        lineNumber,
      })
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

export async function updateTodoCompletion(
  vaultPath: string,
  todoId: string,
  completed: boolean
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

  const line = lines[lineIndex]
  let newLine: string

  if (completed) {
    // Change [ ] to [x]
    newLine = line.replace(/- \[ \]/, '- [x]')
  } else {
    // Change [x] to [ ]
    newLine = line.replace(/- \[[xX]\]/, '- [ ]')
  }

  if (newLine === line) {
    throw new Error('Could not find checkbox to update')
  }

  lines[lineIndex] = newLine
  await fs.writeFile(fullPath, lines.join('\n'), 'utf-8')

  // Return updated todo
  return {
    ...todo,
    completed,
  }
}

export function getTodoById(todos: Todo[], id: string): Todo | undefined {
  return todos.find(t => t.id === id)
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
