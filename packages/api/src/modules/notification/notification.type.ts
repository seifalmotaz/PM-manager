export type NotificationType = 'assigned' | 'deadline_soon' | 'sprint_started' | 'sprint_ended' | 'mentioned'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string | null
  entityType: string | null
  entityId: string | null
  isRead: boolean
  createdAt: Date
}