// ─── Enums ────────────────────────────────────────

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'

export type SprintStatus = 'planned' | 'active' | 'completed'

export type SprintFlag = 'unscheduled' | 'pulled_forward' | 'emergency' | 'reopened'

export type WorkspaceType = 'personal' | 'company'

export type Priority = 'p0' | 'p1' | 'p2' | 'p3'

// ─── Entities ─────────────────────────────────────

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Workspace {
  id: string
  name: string
  slug: string
  type: WorkspaceType
  companyId?: string | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface WorkspaceMember {
  id: string
  workspaceId: string
  userId: string
  role: string
  joinedAt: Date
}

export interface Project {
  id: string
  workspaceId: string
  name: string
  description?: string | null
  color?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Sprint {
  id: string
  projectId: string
  name: string
  goal?: string | null
  startDate: Date
  endDate: Date
  status: SprintStatus
  plannedPoints?: number | null
  createdAt: Date
  updatedAt: Date
}

export interface Task {
  id: string
  projectId: string
  title: string
  description?: string | null
  status: TaskStatus
  priority?: Priority | null
  storyPoints?: number | null
  estimatedHours?: number | null
  actualHours?: number | null
  assigneeId?: string | null
  dueDate?: Date | null
  deadline?: Date | null
  sprintId?: string | null
  sprintFlag?: SprintFlag | null
  order: number
  completedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface AuditLog {
  id: string
  entityType: string
  entityId: string
  action: string
  field?: string | null
  oldValue?: string | null
  newValue?: string | null
  userId: string
  createdAt: Date
}

export interface EmployeeCapacity {
  id: string
  sprintId: string
  userId: string
  capacityHours: number
  note?: string | null
  createdAt: Date
  updatedAt: Date
}

// ─── Auth-specific types ──────────────────────────

export interface AuthUser {
  id: string
  email: string
  name: string
  avatarUrl?: string | null
}