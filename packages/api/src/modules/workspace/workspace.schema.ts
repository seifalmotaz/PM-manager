import { z } from 'zod'

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
})

export const workspaceIdSchema = z.object({
  id: z.string().uuid(),
})

export const workspaceMembersSchema = z.object({
  workspaceId: z.string().uuid(),
})
