export interface Comment {
  id: string
  entityType: 'task' | 'sprint' | 'project'
  entityId: string
  content: string
  authorId: string
  author?: { id: string; name: string; email: string; avatarUrl: string | null }
  createdAt: Date
  updatedAt: Date
}