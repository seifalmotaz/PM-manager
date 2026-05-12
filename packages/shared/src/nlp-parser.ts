export interface ParsedTaskInput {
  title: string
  priority?: 'p0' | 'p1' | 'p2' | 'p3'
  dueDate?: Date
  storyPoints?: number
  assigneeUsername?: string
}

function nextDayOfWeek(dayName: string): Date {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const target = days.indexOf(dayName.toLowerCase())
  const today = new Date()
  const current = today.getDay()
  let diff = target - current
  if (diff <= 0) diff += 7
  const result = new Date(today)
  result.setDate(today.getDate() + diff)
  result.setHours(0, 0, 0, 0)
  return result
}

export function parseTaskInput(input: string): ParsedTaskInput {
  let remaining = input

  // Extract priority: p0, p1, p2, p3 (case-insensitive, word boundary)
  const priorityMatch = remaining.match(/\bp([0-3])\b/i)
  const priority = priorityMatch
    ? (`p${priorityMatch[1]}` as ParsedTaskInput['priority'])
    : undefined
  // Strip ALL occurrences of priority tags from the title
  remaining = remaining.replace(/\bp[0-3]\b/gi, '')

  // Extract story points: sp:5, sp:0.5, sp:13
  const spMatch = remaining.match(/\bsp:(\d+(?:\.\d+)?)\b/i)
  const storyPoints = spMatch ? parseFloat(spMatch[1]) : undefined
  remaining = remaining.replace(/\bsp:\d+(?:\.\d+)?\b/gi, '')

  // Extract assignee: @username
  const assigneeMatch = remaining.match(/@(\w+)/)
  const assigneeUsername = assigneeMatch ? assigneeMatch[1] : undefined
  remaining = remaining.replace(/@\w+/g, '')

  // Extract due date (ordered: first match wins)
  const datePatterns: Array<{
    name: string
    pattern: RegExp
    getDate: (match: string) => Date
  }> = [
    {
      name: 'today',
      pattern: /\btoday\b/gi,
      getDate: () => {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        return d
      },
    },
    {
      name: 'tomorrow',
      pattern: /\btomorrow\b/gi,
      getDate: () => {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        d.setHours(0, 0, 0, 0)
        return d
      },
    },
    {
      name: 'yesterday',
      pattern: /\byesterday\b/gi,
      getDate: () => {
        const d = new Date()
        d.setDate(d.getDate() - 1)
        d.setHours(0, 0, 0, 0)
        return d
      },
    },
    {
      name: 'iso',
      pattern: /\b\d{4}-\d{2}-\d{2}\b/g,
      getDate: (m: string) => {
        const d = new Date(m + 'T00:00:00')
        return d
      },
    },
    {
      name: 'weekday',
      pattern: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
      getDate: (m: string) => nextDayOfWeek(m),
    },
  ]

  let dueDate: Date | undefined
  for (const { pattern, getDate } of datePatterns) {
    const match = remaining.match(pattern)
    if (match) {
      dueDate = getDate(match[0])
      break
    }
  }
  
  // Strip ALL date patterns from the title
  for (const { pattern } of datePatterns) {
    remaining = remaining.replace(pattern, '')
  }

  return {
    title: remaining.trim().replace(/\s+/g, ' '),
    priority,
    storyPoints,
    assigneeUsername,
    dueDate,
  }
}
