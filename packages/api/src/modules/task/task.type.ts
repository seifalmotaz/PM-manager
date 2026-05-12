export interface TaskSummary {
  id: string
  projectId: string
  title: string
  description?: string | null
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority?: 'p0' | 'p1' | 'p2' | 'p3' | null
  storyPoints?: number | null
  estimatedHours?: number | null
  assigneeId?: string | null
  dueDate?: Date | null
  deadline?: Date | null
  sprintId?: string | null
  sprintFlag?: string | null
  statusChangedAt: Date
  startedAt?: Date | null
  completedAt?: Date | null
}
