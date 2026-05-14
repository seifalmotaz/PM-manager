import { z } from 'zod'

export const forProjectSchema = z.object({
  projectId: z.string().uuid(),
})