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
import { auditRouter } from './shared/audit/audit.router'
import { notificationRouter } from './modules/notification/notification.router'
import { forecastRouter } from './modules/forecast/forecast.router'
import { organizationRouter } from './modules/organization/organization.router'
import { orgSessionRouter } from './modules/org-session/org-session.router'
import { timesheetRouter } from './modules/timesheet/timesheet.router'
import { repairRouter } from './modules/repair/repair.router'

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
  audit: auditRouter,
  notification: notificationRouter,
  forecast: forecastRouter,
  organization: organizationRouter,
  orgSession: orgSessionRouter,
  timesheet: timesheetRouter,
  repair: repairRouter,
})

export type AppRouter = typeof appRouter
