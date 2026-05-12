export interface ProjectSummary {
  id: string
  workspaceId: string
  name: string
  description?: string | null
  color?: string | null
  isInbox: boolean
}

export interface CreateProjectInput {
  workspaceId: string
  name: string
  description?: string
  color?: string
}

export interface UpdateProjectInput {
  name?: string
  description?: string
  color?: string
}
