export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TodoViewType = 'all' | 'today' | 'upcoming' | 'someday' | 'done'

export interface Todo {
  id: string              // Hash of filepath + line number
  text: string            // Todo text without checkbox and metadata
  rawText: string         // Original text (for editing)
  completed: boolean      // [ ] vs [x]
  filePath: string        // Relative path to note
  fileName: string        // Note name (without .md)
  lineNumber: number      // Line in file
  indentLevel: number     // 0 = top-level, 1+ = nested
  parentId?: string       // ID of parent todo (for subtasks)
  project?: string        // Derived from folder structure (display name)
  projectPath?: string    // Full path including PARA categories (for file operations)
  dueDate?: string        // Parsed from (YYYY-MM-DD)
  priority?: TodoPriority
  tags?: string[]         // Inline #tags
  created?: string        // File mtime as fallback
}

export interface TodoUpdate {
  completed?: boolean
}

export interface TodoCreate {
  text: string
  projectPath?: string    // Full path for file location
  dueDate?: string        // YYYY-MM-DD
  priority?: TodoPriority
  tags?: string[]
}
