export interface WorkspaceSummary {
  id: string
  name: string
  slug: string
  type: 'personal' | 'company'
  organizationId?: string | null
  memberCount: number
}

export interface WorkspaceMember {
  id: string
  workspaceId: string
  userId: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: Date
  user?: {
    id: string
    name: string
    email: string
    avatarUrl?: string | null
  }
}
