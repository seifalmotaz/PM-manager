import { router } from './trpc'
import { authRouter } from './modules/auth/auth.router'
import { workspaceRouter } from './modules/workspace/workspace.router'
import { projectRouter } from './modules/project/project.router'
import { taskRouter } from './modules/task/task.router'
import { sprintRouter } from './modules/sprint/sprint.router'
import { velocityRouter } from './modules/velocity/velocity.router'
import { capacityRouter } from './modules/sprint/capacity.router'
import { commentRouter } from './modules/comment/comment.router'
import { checklistRouter } from './modules/checklist/checklist.router'
import { timeEntryRouter } from './modules/time-entry/time-entry.router'
import { auditRouter } from './shared/audit/audit.router'
import { notificationRouter } from './modules/notification/notification.router'
import { forecastRouter } from './modules/forecast/forecast.router'

export const appRouter = router({
  auth: authRouter,
  workspace: workspaceRouter,
  project: projectRouter,
  task: taskRouter,
  sprint: sprintRouter,
  velocity: velocityRouter,
  capacity: capacityRouter,
  comment: commentRouter,
  checklist: checklistRouter,
  timeEntry: timeEntryRouter,
  audit: auditRouter,
  notification: notificationRouter,
  forecast: forecastRouter,
})

export type AppRouter = typeof appRouter
