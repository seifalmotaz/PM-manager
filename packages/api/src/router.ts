import { router } from './trpc'
import { authRouter } from './modules/auth/auth.router'
import { workspaceRouter } from './modules/workspace/workspace.router'
import { projectRouter } from './modules/project/project.router'
import { taskRouter } from './modules/task/task.router'

export const appRouter = router({
  auth: authRouter,
  workspace: workspaceRouter,
  project: projectRouter,
  task: taskRouter,
})

export type AppRouter = typeof appRouter
