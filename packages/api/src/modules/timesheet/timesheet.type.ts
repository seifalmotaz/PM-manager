export interface SessionRow {
  id: string
  organizationId: string
  startTime: Date
  endTime: Date | null
  tasksCompleted: number | null
  storyPointsCompleted: string | null
  estimatedHoursSum: string | null
  frozen: boolean
  note: string | null
}

export interface DayData {
  date: string // ISO date string (YYYY-MM-DD)
  sessions: SessionRow[]
  totalDuration: number // milliseconds
  totalTasks: number
  totalSP: number
}

export interface WeekData {
  days: DayData[]
  weekStart: Date
  weekEnd: Date
  weekTotals: {
    totalDuration: number
    totalTasks: number
    totalSP: number
  }
}