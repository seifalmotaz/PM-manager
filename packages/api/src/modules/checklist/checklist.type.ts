export interface ChecklistItem {
  id: string
  taskId: string
  content: string
  isCompleted: boolean
  sortOrder: number
  createdAt: Date
}