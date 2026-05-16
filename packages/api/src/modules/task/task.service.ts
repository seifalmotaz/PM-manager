import { db } from '../../db/connection'
import { tasks, projects, workspaceMembers, sprints, workspaces } from '../../db/schema'
import { eq, and, lt, ne, asc, inArray, count, or, ilike } from 'drizzle-orm'
import { createAuditLog, auditFieldChange } from '../../shared/audit/audit.service'
import { projectService } from '../project/project.service'
import { workspaceService } from '../workspace/workspace.service'
import { sprintService } from '../sprint/sprint.service'
import { notificationService } from '../notification/notification.service'
import { TRPCError } from '@trpc/server'
import { parseTaskInput } from './nlp-parser'
import type { ParsedTaskInput } from './nlp-parser'

export interface CreateTaskInput {
  projectId: string
  title: string
  priority?: string
  storyPoints?: number
  estimatedHours?: number
  assigneeId?: string
  dueDate?: string
  sprintId?: string
  sprintFlag?: string
  description?: string
}

export interface ListTasksFilters {
  workspaceIds?: string[]
  projectId?: string
  sprintId?: string
  status?: string
  assigneeId?: string
}

async function listTasks(
  filters: ListTasksFilters,
  userId: string,
): Promise<Record<string, unknown>[]> {
  const conditions: any[] = []

  if (filters.workspaceIds && filters.workspaceIds.length > 0) {
    const projRows = await db
      .select({ id: projects.id })
      .from(projects)
      .where(inArray(projects.workspaceId, filters.workspaceIds))
    const projIds = projRows.map(p => p.id)
    if (projIds.length === 0) return []
    conditions.push(inArray(tasks.projectId, projIds))
  }

  if (filters.projectId) {
    conditions.push(eq(tasks.projectId, filters.projectId))
  }
  if (filters.sprintId) {
    conditions.push(eq(tasks.sprintId, filters.sprintId))
  }
  if (filters.status) {
    conditions.push(eq(tasks.status, filters.status))
  }
  if (filters.assigneeId) {
    conditions.push(eq(tasks.assigneeId, filters.assigneeId))
  }

  return db
    .select()
    .from(tasks)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(tasks.createdAt))
}

type TaskRow = {
  id: string
  projectId: string
  title: string
  description: string | null
  status: string
  priority: string | null
  storyPoints: string | null
  estimatedHours: string | null
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
  project: typeof projects.$inferSelect | null
}

async function getTask(id: string, userId: string): Promise<TaskRow> {
  const rows = await db
    .select({
      task: tasks,
      project: projects,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(tasks.id, id))
    .limit(1)

  if (rows.length === 0) throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })

  const row = rows[0]

  // Verify project access
  await projectService.getProject(row.task.projectId, userId)

  return {
    ...row.task,
    project: row.project,
  }
}

async function createTask(input: CreateTaskInput, userId: string) {
  // Verify project access
  await projectService.getProject(input.projectId, userId)

  // Sprint lock enforcement
  if (input.sprintId) {
    const sprint = await sprintService.getSprint(input.sprintId, userId)
    if (sprintService.isSprintLocked(sprint)) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Cannot assign tasks to a completed sprint',
      })
    }
  }

  // If sprintFlag is provided but no sprintId, clear the flag
  if (input.sprintFlag && !input.sprintId) {
    input.sprintFlag = undefined
  }

  const dueDateValue = input.dueDate ? new Date(input.dueDate) : undefined

  const [task] = await db
    .insert(tasks)
    .values({
      projectId: input.projectId,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? null,
      storyPoints: input.storyPoints != null ? String(input.storyPoints) : null,
      estimatedHours: input.estimatedHours != null ? String(input.estimatedHours) : null,
      assigneeId: input.assigneeId ?? null,
      dueDate: dueDateValue ?? null,
      sprintId: input.sprintId ?? null,
      sprintFlag: (input.sprintId && input.sprintFlag) ? input.sprintFlag : null,
      status: 'todo',
      statusChangedAt: new Date(),
    })
    .returning()

  await createAuditLog({
    entityType: 'task',
    entityId: task.id,
    action: 'created',
    userId,
  })

  // Notify assignee (but not yourself)
  if (input.assigneeId && input.assigneeId !== userId) {
    notificationService.notifyAssigned(task.id, task.title, input.assigneeId)
  }

  return task
}

async function updateTask(
  id: string,
  updates: Record<string, unknown>,
  userId: string,
) {
  const task = await getTask(id, userId)
  const updateData: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(updates)) {
    if (key === 'id') continue

    // Sprint lock enforcement when changing sprintId
    if (key === 'sprintId') {
      const newSprintId = value as string | null | undefined

      if (newSprintId) {
        // Verify the sprint exists and is not locked
        const sprint = await sprintService.getSprint(newSprintId, userId)
        if (sprintService.isSprintLocked(sprint)) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Cannot assign tasks to a completed sprint',
          })
        }
      }

      // Audit log for sprint reassignment
      auditFieldChange(
        'task', id, userId, 'sprintId',
        task.sprintId || 'none',
        newSprintId || 'none',
      )

      // If sprintId is being set to null (moving to Backlog), also clear sprintFlag
      if (newSprintId === null || newSprintId === undefined) {
        updateData.sprintFlag = null
      }

      // Apply sprintId update directly (skip generic loop fallthrough)
      if (newSprintId !== task.sprintId) {
        updateData.sprintId = newSprintId
      }
      continue
    }

    let currentValue = (task as Record<string, unknown>)[key]

    // Drizzle returns decimal columns as strings — coerce to number for comparison
    if (currentValue !== undefined && currentValue !== null && (key === 'storyPoints' || key === 'estimatedHours')) {
      currentValue = Number(currentValue)
    }

    // Handle date field conversions
    let normalizedValue = value
    if (key === 'dueDate' || key === 'deadline') {
      if (value === null) {
        normalizedValue = null
      } else if (typeof value === 'string') {
        normalizedValue = new Date(value)
      }
    }

    if (normalizedValue !== undefined && currentValue !== normalizedValue) {
      updateData[key] = normalizedValue

      // auditFieldChange is fire-and-forget
      auditFieldChange('task', id, userId, key, currentValue, normalizedValue)
    }
  }

  // Notify on assignee change (but not self-assignment)
  const newAssigneeId = updates.assigneeId as string | undefined
  if (
    newAssigneeId !== undefined &&
    newAssigneeId !== task.assigneeId &&
    newAssigneeId !== userId
  ) {
    notificationService.notifyAssigned(id, task.title, newAssigneeId)
  }

  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = new Date()

    const [updated] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning()

    return updated
  }

  return task
}

async function changeStatus(id: string, newStatus: string, userId: string) {
  const task = await getTask(id, userId)
  const now = new Date()

  const oldStatus = task.status

  const statusData: Record<string, unknown> = {
    status: newStatus,
    statusChangedAt: now,
  }

  // Timestamp management
  if (newStatus === 'in_progress' && !task.startedAt) {
    statusData.startedAt = now
  }
  if (newStatus === 'done') {
    statusData.completedAt = now
  }
  if (oldStatus === 'done' && newStatus !== 'done') {
    statusData.completedAt = null
  }

  const [updated] = await db
    .update(tasks)
    .set({ ...statusData, updatedAt: now })
    .where(eq(tasks.id, id))
    .returning()

  // Create status_changed audit entry
  await createAuditLog({
    entityType: 'task',
    entityId: id,
    action: 'status_changed',
    field: 'status',
    oldValue: oldStatus,
    newValue: newStatus,
    userId,
  })

  // If task is first entering in_progress, audit the startedAt timestamp
  if (newStatus === 'in_progress' && !task.startedAt) {
    await createAuditLog({
      entityType: 'task',
      entityId: id,
      action: 'updated',
      field: 'startedAt',
      oldValue: undefined,
      newValue: now.toISOString(),
      userId,
    })
  }

  // If reopening from done, create additional audit entry for completedAt clearing
  if (oldStatus === 'done' && newStatus !== 'done') {
    await createAuditLog({
      entityType: 'task',
      entityId: id,
      action: 'updated',
      field: 'completedAt',
      oldValue: task.completedAt?.toISOString() ?? undefined,
      newValue: undefined,
      userId,
    })
  }

  return updated
}

async function getOverdueCount(userId: string): Promise<number> {
  const userWss = await workspaceService.listUserWorkspaces(userId)
  const wsIds = userWss.map(w => w.id)
  if (wsIds.length === 0) return 0

  const projRows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(inArray(projects.workspaceId, wsIds))
  const projIds = projRows.map(p => p.id)
  if (projIds.length === 0) return 0

  const [result] = await db
    .select({ value: count() })
    .from(tasks)
    .where(and(
      lt(tasks.deadline, new Date()),
      ne(tasks.status, 'done'),
      inArray(tasks.projectId, projIds)
    ))

  return result?.value ?? 0
}

async function deleteTask(id: string, userId: string) {
  await getTask(id, userId)

  // Audit before deletion
  await createAuditLog({
    entityType: 'task',
    entityId: id,
    action: 'deleted',
    userId,
  })

  await db.delete(tasks).where(eq(tasks.id, id))
}

async function listHome(workspaceIds: string[], userId: string) {
  // Note: userId is available for future use (e.g., filtering by assigned tasks)
  void userId

  if (workspaceIds.length === 0) return []

  // Find projects belonging to the given workspaces
  const projRows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(inArray(projects.workspaceId, workspaceIds))

  const projectIds = projRows.map((p) => p.id)

  if (projectIds.length === 0) return []

  const rows = await db
    .select({
      task: tasks,
      project: projects,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(inArray(tasks.projectId, projectIds))
    .orderBy(asc(tasks.createdAt))

  return rows.map(row => ({
    ...row.task,
    project: row.project,
  }))
}

async function listTasksWithOrganization(
  workspaceIds: string[],
  userId: string,
): Promise<(typeof tasks.$inferSelect & { project: typeof projects.$inferSelect | null; organization: { id: string; name: string } | null })[]> {
  // Note: userId is available for future use (e.g., filtering by assigned tasks)
  void userId

  if (workspaceIds.length === 0) return []

  // Get projects in workspaces
  const projRows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(inArray(projects.workspaceId, workspaceIds))

  const projectIds = projRows.map(p => p.id)
  if (projectIds.length === 0) return []

  // Get tasks with their projects and workspace org IDs
  const rows = await db
    .select({
      task: tasks,
      project: projects,
      workspace: workspaces,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .leftJoin(workspaces, eq(projects.workspaceId, workspaces.id))
    .where(inArray(tasks.projectId, projectIds))
    .orderBy(asc(tasks.createdAt))

  return rows.map(row => ({
    ...row.task,
    project: row.project,
    organization: row.workspace?.organizationId
      ? { id: row.workspace.organizationId, name: '' } // Frontend will resolve name
      : null,
  }))
}

export interface TaskSearchResult {
  tasks: Array<{ id: string; title: string; status: string; priority: string | null; projectId: string; projectName?: string }>
  projects: Array<{ id: string; name: string; workspaceId: string }>
  sprints: Array<{ id: string; name: string; projectId: string }>
}

async function searchTasks(query: string, workspaceIds: string[] | undefined, userId: string): Promise<TaskSearchResult> {
  // Resolve visible workspace IDs
  let visibleWorkspaceIds: string[]
  if (workspaceIds && workspaceIds.length > 0) {
    visibleWorkspaceIds = workspaceIds
  } else {
    const memberships = await db
      .select({ workspaceId: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, userId))
    visibleWorkspaceIds = memberships.map((m) => m.workspaceId)
  }

  if (visibleWorkspaceIds.length === 0) {
    return { tasks: [], projects: [], sprints: [] }
  }

  // Get all project IDs in visible workspaces
  const visibleProjects = await db
    .select({ id: projects.id, name: projects.name, workspaceId: projects.workspaceId })
    .from(projects)
    .where(inArray(projects.workspaceId, visibleWorkspaceIds))

  const projectIds = visibleProjects.map((p) => p.id)
  const projectMap = new Map(visibleProjects.map((p) => [p.id, p.name]))

  if (projectIds.length === 0) {
    return { tasks: [], projects: [], sprints: [] }
  }

  // Search tasks by title using ILIKE
  const taskResults = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      projectId: tasks.projectId,
    })
    .from(tasks)
    .where(
      and(
        inArray(tasks.projectId, projectIds),
        or(
          ilike(tasks.title, `%${query}%`),
          ilike(tasks.description, `%${query}%`),
        ),
      ),
    )
    .limit(10)

  // Enrich task results with project name
  const enrichedTasks = taskResults.map((t) => ({
    ...t,
    projectName: projectMap.get(t.projectId) ?? undefined,
  }))

  // Search projects by name
  const projectResults = await db
    .select({ id: projects.id, name: projects.name, workspaceId: projects.workspaceId })
    .from(projects)
    .where(and(inArray(projects.id, projectIds), ilike(projects.name, `%${query}%`)))
    .limit(5)

  // Search sprints by name
  const sprintResults = await db
    .select({ id: sprints.id, name: sprints.name, projectId: sprints.projectId })
    .from(sprints)
    .where(and(inArray(sprints.projectId, projectIds), ilike(sprints.name, `%${query}%`)))
    .limit(5)

  return {
    tasks: enrichedTasks,
    projects: projectResults,
    sprints: sprintResults,
  }
}

async function listTasksByOrg(organizationId: string, userId: string) {
  // Find all workspaces belonging to this org where user is a member
  const userWss = await db
    .select({ wsId: workspaces.id })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaces.organizationId, organizationId),
      ),
    )

  const wsIds = userWss.map(row => row.wsId)
  if (wsIds.length === 0) return []

  // Find projects in those workspaces
  const projRows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(inArray(projects.workspaceId, wsIds))

  const projectIds = projRows.map(p => p.id)
  if (projectIds.length === 0) return []

  // Fetch tasks from those projects
  const rows = await db
    .select({
      task: tasks,
      project: projects,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(inArray(tasks.projectId, projectIds))
    .orderBy(asc(tasks.createdAt))

  return rows.map(row => ({
    ...row.task,
    project: row.project,
  }))
}

export const taskService = {
  parseTaskInput,
  listTasks,
  getTask,
  createTask,
  updateTask,
  changeStatus,
  deleteTask,
  getOverdueCount,
  listHome,
  listTasksWithOrganization,
  searchTasks,
  listTasksByOrg,
}
