export interface TimeEntry {
  id: string
  taskId: string
  userId: string
  startTime: Date
  endTime: Date | null
  durationMinutes: number | null
  note: string | null
  isManual: boolean
  createdAt: Date
  task?: { id: string; title: string }
}