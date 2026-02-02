import chokidar from 'chokidar'
import path from 'path'

type ChangeCallback = (event: 'add' | 'change' | 'unlink', filepath: string) => void

let watcher: chokidar.FSWatcher | null = null
const callbacks: Set<ChangeCallback> = new Set()

export function startWatcher(directory: string): void {
  if (watcher) {
    console.log('Watcher already running')
    return
  }

  const globPattern = path.join(directory, '*.md')

  watcher = chokidar.watch(globPattern, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  })

  watcher
    .on('add', (filepath) => notifyCallbacks('add', filepath))
    .on('change', (filepath) => notifyCallbacks('change', filepath))
    .on('unlink', (filepath) => notifyCallbacks('unlink', filepath))
    .on('error', (error) => console.error('Watcher error:', error))

  console.log(`Watching for changes in ${directory}`)
}

export function stopWatcher(): void {
  if (watcher) {
    watcher.close()
    watcher = null
    console.log('Watcher stopped')
  }
}

export function onFileChange(callback: ChangeCallback): () => void {
  callbacks.add(callback)
  return () => callbacks.delete(callback)
}

function notifyCallbacks(event: 'add' | 'change' | 'unlink', filepath: string): void {
  callbacks.forEach((callback) => {
    try {
      callback(event, filepath)
    } catch (error) {
      console.error('Callback error:', error)
    }
  })
}
