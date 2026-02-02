// Tag color configuration
// Add tags here to give them custom colors

const tagColors: Record<string, { bg: string; text: string }> = {
  bug: { bg: 'bg-red-100', text: 'text-red-700' },
  fix: { bg: 'bg-red-100', text: 'text-red-700' },
  feature: { bg: 'bg-green-100', text: 'text-green-700' },
  enhancement: { bg: 'bg-blue-100', text: 'text-blue-700' },
  improvement: { bg: 'bg-blue-100', text: 'text-blue-700' },
  urgent: { bg: 'bg-orange-100', text: 'text-orange-700' },
  backend: { bg: 'bg-purple-100', text: 'text-purple-700' },
  frontend: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  app: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  web: { bg: 'bg-teal-100', text: 'text-teal-700' },
  api: { bg: 'bg-violet-100', text: 'text-violet-700' },
  docs: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  test: { bg: 'bg-pink-100', text: 'text-pink-700' },
  refactor: { bg: 'bg-slate-100', text: 'text-slate-700' },
}

const defaultColor = { bg: 'bg-gray-100', text: 'text-gray-600' }

export function getTagColor(tag: string): { bg: string; text: string } {
  const lowerTag = tag.toLowerCase()
  return tagColors[lowerTag] || defaultColor
}

export function getTagClasses(tag: string): string {
  const color = getTagColor(tag)
  return `${color.bg} ${color.text}`
}
