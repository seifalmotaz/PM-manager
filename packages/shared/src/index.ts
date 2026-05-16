// Core domain types for Saha

export interface User {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export type WorkspaceType = 'personal' | 'company'

export interface Workspace {
  id: string
  name: string
  slug: string
  type: WorkspaceType
  organizationId: string | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export type MemberRole = 'owner' | 'admin' | 'member'

export interface WorkspaceMember {
  id: string
  workspaceId: string
  userId: string
  role: MemberRole
  joinedAt: Date
}

export interface Project {
  id: string
  workspaceId: string
  name: string
  description: string | null
  color: string | null
  isInbox: boolean
  createdAt: Date
  updatedAt: Date
}

export type TaskStatus = 'todo' | 'in_progress' | 'done'

// Valid status transitions (adjacent only)
export const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  'todo': ['in_progress'],
  'in_progress': ['done', 'todo'],
  'done': ['in_progress']
}

export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}
export type Priority = 'p0' | 'p1' | 'p2' | 'p3'

export interface Task {
  id: string
  projectId: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority | null
  storyPoints: number | null
  estimatedHours: number | null
  assigneeId: string | null
  dueDate: Date | null
  deadline: Date | null
  sprintId: string | null
  sprintFlag: string | null
  statusChangedAt: Date
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type SprintStatus = 'planned' | 'active' | 'completed'

export interface Sprint {
  id: string
  projectId: string
  name: string
  goal: string | null
  startDate: Date
  endDate: Date
  status: SprintStatus
  plannedPoints: number | null
  createdAt: Date
  updatedAt: Date
}

export interface AuditLog {
  id: string
  entityType: string
  entityId: string
  action: string
  field: string | null
  oldValue: string | null
  newValue: string | null
  userId: string
  createdAt: Date
}

export interface EmployeeCapacity {
  id: string
  sprintId: string
  userId: string
  capacityHours: number
  note: string | null
  createdAt: Date
  updatedAt: Date
}
