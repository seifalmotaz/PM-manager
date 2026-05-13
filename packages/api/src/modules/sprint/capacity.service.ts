import { db } from '../../db/connection'
import { tasks, employeeCapacity, workspaceMembers, users } from '../../db/schema'
import { eq, and } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { createAuditLog } from '../../shared/audit/audit.service'
import { sprintService } from './sprint.service'
import { projectService } from '../project/project.service'

export interface MemberCapacity {
  userId: string
  user: { name: string; email: string }
  taskCount: number
  estimatedHours: number
  capacityHours: number | null
  note: string | null
  isOverloaded: boolean
  overloadPercent: number | null
}

async function getCapacityTable(sprintId: string, userId: string): Promise<MemberCapacity[]> {
  // Verify access and get sprint
  const sprint = await sprintService.getSprint(sprintId, userId)

  // Get workspaceId via projectService
  const project = await projectService.getProject(sprint.projectId, userId)
  const workspaceId = project.workspaceId

  // Get all workspace members
  const members = await db
    .select({
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      userName: users.name,
      userEmail: users.email,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspaceId))

  // Get all tasks assigned to this sprint
  const sprintTasks = await db
    .select({
      id: tasks.id,
      assigneeId: tasks.assigneeId,
      estimatedHours: tasks.estimatedHours,
    })
    .from(tasks)
    .where(eq(tasks.sprintId, sprintId))

  // Get existing capacity entries for this sprint
  const capacities = await db
    .select()
    .from(employeeCapacity)
    .where(eq(employeeCapacity.sprintId, sprintId))

  // Build result array
  return members.map((member) => {
    const userTasks = sprintTasks.filter((t) => t.assigneeId === member.userId)
    const estimatedHours = userTasks.reduce((sum, t) => sum + Number(t.estimatedHours || 0), 0)
    const taskCount = userTasks.length
    const capacity = capacities.find((c) => c.userId === member.userId)

    const capacityHours = capacity ? Number(capacity.capacityHours) : null
    const note = capacity?.note ?? null

    const isOverloaded = capacity ? estimatedHours > Number(capacity.capacityHours) : false
    const overloadPercent =
      capacity && Number(capacity.capacityHours) > 0
        ? Math.round((estimatedHours / Number(capacity.capacityHours)) * 100)
        : null

    return {
      userId: member.userId,
      user: {
        name: member.userName ?? '',
        email: member.userEmail ?? '',
      },
      taskCount,
      estimatedHours,
      capacityHours,
      note,
      isOverloaded,
      overloadPercent,
    }
  })
}

async function setCapacity(
  input: { sprintId: string; userId: string; capacityHours: number; note?: string },
  actorUserId: string,
) {
  // Verify sprint access
  const sprint = await sprintService.getSprint(input.sprintId, actorUserId)

  // Get workspaceId via projectService
  const project = await projectService.getProject(sprint.projectId, actorUserId)
  const workspaceId = project.workspaceId

  // Verify target user is a workspace member
  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, input.userId)))
    .limit(1)

  if (!membership) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'User is not a member of this workspace',
    })
  }

  // Check for existing capacity entry
  const [existing] = await db
    .select()
    .from(employeeCapacity)
    .where(
      and(
        eq(employeeCapacity.sprintId, input.sprintId),
        eq(employeeCapacity.userId, input.userId),
      ),
    )
    .limit(1)

  let result
  if (existing) {
    const [updated] = await db
      .update(employeeCapacity)
      .set({
        capacityHours: String(input.capacityHours),
        note: input.note ?? null,
        updatedAt: new Date(),
      })
      .where(eq(employeeCapacity.id, existing.id))
      .returning()
    result = updated
  } else {
    const [created] = await db
      .insert(employeeCapacity)
      .values({
        sprintId: input.sprintId,
        userId: input.userId,
        capacityHours: String(input.capacityHours),
        note: input.note ?? null,
      })
      .returning()
    result = created
  }

  // Audit log
  await createAuditLog({
    entityType: 'sprint',
    entityId: input.sprintId,
    action: 'updated',
    field: 'capacity',
    oldValue: existing ? String(existing.capacityHours) : undefined,
    newValue: String(input.capacityHours),
    userId: actorUserId,
  })

  return result
}

export const capacityService = { getCapacityTable, setCapacity }