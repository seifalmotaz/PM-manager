import { db } from '../../db/connection'
import { sprints, tasks } from '../../db/schema'
import { eq, and, isNull, sql, asc } from 'drizzle-orm'
import { createAuditLog } from '../../shared/audit/audit.service'
import { projectService } from '../project/project.service'
import { TRPCError } from '@trpc/server'
import type { Sprint } from './sprint.type'

type SprintStatus = 'planned' | 'active' | 'completed'

type SprintRow = {
  id: string
  projectId: string
  name: string
  goal: string | null
  startDate: Date
  endDate: Date
  status: SprintStatus
  plannedPoints: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Compute sprint status based on current date and date boundaries.
 */
function getSprintStatus(sprint: Pick<SprintRow, 'startDate' | 'endDate'>): SprintStatus {
  const now = new Date()
  if (now > sprint.endDate) return 'completed'
  if (now >= sprint.startDate) return 'active'
  return 'planned'
}

/**
 * Returns true if the sprint is locked (completed).
 */
function isSprintLocked(sprint: Pick<SprintRow, 'startDate' | 'endDate'>): boolean {
  return getSprintStatus(sprint) === 'completed'
}

/**
 * Sum of storyPoints for tasks assigned to this sprint (sprintId = id) that are NOT flagged.
 * Only sums tasks where sprintFlag IS NULL (excludes "unscheduled" and other flagged tasks).
 * Returns a JavaScript number, not a string.
 */
async function computePlannedPoints(sprintId: string): Promise<number> {
  const [result] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${tasks.storyPoints})::float, 0)`,
    })
    .from(tasks)
    .where(and(eq(tasks.sprintId, sprintId), isNull(tasks.sprintFlag)))

  return Number(result?.total ?? 0)
}

/**
 * Lazily update sprint status in DB if it has changed since last write.
 * If transitioning to 'completed', also compute and store plannedPoints.
 * Returns the sprint (may be mutated if status was updated).
 */
async function refreshSprintStatus(sprint: SprintRow): Promise<SprintRow> {
  const computedStatus = getSprintStatus(sprint)
  if (computedStatus === sprint.status) return sprint

  const updatePayload: Record<string, unknown> = {
    status: computedStatus,
    updatedAt: new Date(),
  }

  // If completing the sprint, compute plannedPoints
  if (computedStatus === 'completed') {
    updatePayload.plannedPoints = await computePlannedPoints(sprint.id)
  }

  const [updated] = await db
    .update(sprints)
    .set(updatePayload)
    .where(and(eq(sprints.id, sprint.id), eq(sprints.status, sprint.status)))
    .returning()

  // If no row was updated (concurrent race), refetch
  return (updated ?? (await getSprintById(sprint.id))!) as SprintRow
}

/**
 * Internal: fetch sprint by id without access check.
 */
async function getSprintById(id: string): Promise<SprintRow | null> {
  const [row] = await db.select().from(sprints).where(eq(sprints.id, id)).limit(1)
  return row as SprintRow ?? null
}

/**
 * List all sprints for a project. Access-checked via projectService.
 * Performs lazy status refresh for any sprint whose computed status differs from stored status.
 */
async function listByProject(projectId: string, userId: string): Promise<SprintRow[]> {
  // Access check
  await projectService.getProject(projectId, userId)

  const rows = await db
    .select()
    .from(sprints)
    .where(eq(sprints.projectId, projectId))
    .orderBy(asc(sprints.startDate))

  // Lazy status refresh
  const updated = await Promise.all(rows.map((r) => refreshSprintStatus(r as SprintRow)))
  return updated
}

/**
 * Get a single sprint by id. Access-checked via projectService.
 */
async function getSprint(id: string, userId: string): Promise<SprintRow> {
  const sprint = await getSprintById(id)
  if (!sprint) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Sprint not found' })
  }

  // Access check via projectService
  await projectService.getProject(sprint.projectId, userId)

  // Lazy status refresh
  return refreshSprintStatus(sprint as SprintRow)
}

/**
 * Create a new sprint. Access-checked via projectService.
 */
async function createSprint(
  input: { projectId: string; name: string; goal?: string; startDate: string; endDate: string },
  userId: string,
): Promise<SprintRow> {
  // Access check
  await projectService.getProject(input.projectId, userId)

  const startDate = new Date(input.startDate)
  const endDate = new Date(input.endDate)

  if (startDate >= endDate) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Start date must be before end date',
    })
  }

  const computedStatus = getSprintStatus({ startDate, endDate })

  const [created] = await db
    .insert(sprints)
    .values({
      projectId: input.projectId,
      name: input.name,
      goal: input.goal ?? null,
      startDate,
      endDate,
      status: computedStatus,
    })
    .returning()

  await createAuditLog({
    entityType: 'sprint',
    entityId: created.id,
    action: 'created',
    userId,
  })

  return created as SprintRow
}

/**
 * Update sprint fields. Access-checked via getSprint.
 * Cannot modify a completed sprint.
 * Creates per-field audit entries for changed fields.
 */
async function updateSprint(
  id: string,
  updates: { name?: string; goal?: string; startDate?: string; endDate?: string },
  userId: string,
): Promise<SprintRow> {
  const existing = await getSprint(id, userId)

  if (existing.status === 'completed') {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Cannot modify a completed sprint',
    })
  }

  const updatePayload: Record<string, unknown> = { updatedAt: new Date() }
  const auditEntries: Array<{ field: string; oldValue: string; newValue: string }> = []

  if (updates.name !== undefined && updates.name !== existing.name) {
    updatePayload.name = updates.name
    auditEntries.push({ field: 'name', oldValue: existing.name, newValue: updates.name })
  }
  if (updates.goal !== undefined && updates.goal !== existing.goal) {
    updatePayload.goal = updates.goal
    auditEntries.push({
      field: 'goal',
      oldValue: existing.goal ?? '',
      newValue: updates.goal,
    })
  }
  if (updates.startDate !== undefined) {
    const newStart = new Date(updates.startDate)
    updatePayload.startDate = newStart
    auditEntries.push({
      field: 'startDate',
      oldValue: existing.startDate.toISOString(),
      newValue: newStart.toISOString(),
    })
  }
  if (updates.endDate !== undefined) {
    const newEnd = new Date(updates.endDate)
    updatePayload.endDate = newEnd
    auditEntries.push({
      field: 'endDate',
      oldValue: existing.endDate.toISOString(),
      newValue: newEnd.toISOString(),
    })
  }

  // Write per-field audit entries before updating
  for (const entry of auditEntries) {
    await createAuditLog({
      entityType: 'sprint',
      entityId: id,
      action: 'updated',
      field: entry.field,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      userId,
    })
  }

  // If no fields changed, return existing
  if (Object.keys(updatePayload).length === 1) {
    return existing
  }

  const [updated] = await db
    .update(sprints)
    .set(updatePayload)
    .where(eq(sprints.id, id))
    .returning()

  return updated as SprintRow
}

/**
 * Delete a sprint. Access-checked via getSprint.
 * Handles task reassignment or deletion BEFORE deleting the sprint.
 * The tasks.sprintId FK is ON DELETE NO ACTION, so we must manually unassign/delete tasks first.
 *
 * @param deleteTasks - if true, hard-delete tasks; if false, unassign them (sprintId = null)
 */
async function deleteSprint(id: string, userId: string, deleteTasks: boolean): Promise<void> {
  const sprint = await getSprint(id, userId)

  // Handle tasks BEFORE deleting the sprint (FK is NO ACTION)
  if (deleteTasks) {
    await db.delete(tasks).where(eq(tasks.sprintId, id))
  } else {
    await db.update(tasks).set({ sprintId: null }).where(eq(tasks.sprintId, id))
  }

  await createAuditLog({
    entityType: 'sprint',
    entityId: id,
    action: 'deleted',
    userId,
  })

  await db.delete(sprints).where(eq(sprints.id, id))
}

export const sprintService = {
  listByProject,
  getSprint,
  createSprint,
  updateSprint,
  deleteSprint,
  isSprintLocked,
  computePlannedPoints,
}