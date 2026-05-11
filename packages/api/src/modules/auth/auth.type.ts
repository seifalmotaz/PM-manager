import type { User } from 'shared'

export interface AuthUser {
  id: string
  email: string
  name: string
  avatarUrl?: string | null
}

export interface SessionData {
  user: AuthUser
}
