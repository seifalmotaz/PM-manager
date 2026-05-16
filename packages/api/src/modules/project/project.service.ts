import { db } from '../../db/connection'
import { projects, workspaces, workspaceMembers } from '../../db/schema'
import { eq, and, inArray, asc } from 'drizzle-orm'
import { createAuditLog } from '../../shared/audit/audit.service'
import { workspaceService } from '../workspace/workspace.service'
import { TRPCError } from '@trpc/server'

async function listByOrg(organizationId: string, userId: string) {
  // Find all workspaces belonging to this org where user is a member
  // Use two-step approach to avoid Drizzle join issues with nullable org_id
  const userMemberships = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))

  const memberWorkspaceIds = userMemberships.map(m => m.workspaceId)
  if (memberWorkspaceIds.length === 0) return []

  const userWss = await db
    .select({ wsId: workspaces.id })
    .from(workspaces)
    .where(and(
      inArray(workspaces.id, memberWorkspaceIds),
      eq(workspaces.organizationId, organizationId),
    ))

  const wsIds = userWss.map(row => row.wsId)
  if (wsIds.length === 0) return []

  // Find projects in those workspaces
  const rows = await db
    .select()
    .from(projects)
    .where(inArray(projects.workspaceId, wsIds))
    .orderBy(asc(projects.createdAt))

  return rows
}

async function listProjects(workspaceId: string | undefined, userId: string) {
  if (workspaceId) {
    // Verify membership for the specific workspace
    await workspaceService.getWorkspace(workspaceId, userId)

    return db
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId))
      .orderBy(asc(projects.name))
  }

  // When no workspaceId is provided, return projects from all workspaces
  // the user is a member of
  const userWorkspaces = await workspaceService.listUserWorkspaces(userId)
  const wsIds = userWorkspaces.map((w) => w.id)
  if (wsIds.length === 0) return []

  // Fetch projects from all accessible workspaces
  const results: any[] = []
  for (const wsId of wsIds) {
    const wsProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, wsId))
    results.push(...wsProjects)
  }
  results.sort((a, b) => a.name.localeCompare(b.name))
  return results
}

async function getProject(id: string, userId: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1)

  if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })

  // Verify workspace membership
  await workspaceService.getWorkspace(project.workspaceId, userId)

  return project
}

async function createProject(
  input: { workspaceId: string; name: string; description?: string; color?: string },
  userId: string,
) {
  // Verify workspace membership
  await workspaceService.getWorkspace(input.workspaceId, userId)

  const [project] = await db
    .insert(projects)
    .values({
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? null,
    })
    .returning()

  // Audit log for creation
  await createAuditLog({
    entityType: 'project',
    entityId: project.id,
    action: 'created',
    userId,
  })

  return project
}

async function updateProject(
  id: string,
  updates: { name?: string; description?: string; color?: string },
  userId: string,
) {
  // Fetch existing project (throws if not found or no workspace access)
  const existing = await getProject(id, userId)

  // Build update payload with only provided fields + updatedAt
  const updatePayload: Record<string, unknown> = { updatedAt: new Date() }
  if (updates.name !== undefined) updatePayload.name = updates.name
  if (updates.description !== undefined) updatePayload.description = updates.description
  if (updates.color !== undefined) updatePayload.color = updates.color

  const [updated] = await db
    .update(projects)
    .set(updatePayload)
    .where(eq(projects.id, id))
    .returning()

  // Create per-field audit entries for changed fields only
  // Use await createAuditLog directly (not the fire-and-forget auditFieldChange)
  // to ensure audit entries are written before returning (needed for tests)
  if (updates.name !== undefined && updates.name !== existing.name) {
    await createAuditLog({
      entityType: 'project',
      entityId: id,
      action: 'updated',
      field: 'name',
      oldValue: existing.name,
      newValue: updates.name,
      userId,
    })
  }
  if (updates.description !== undefined && updates.description !== existing.description) {
    await createAuditLog({
      entityType: 'project',
      entityId: id,
      action: 'updated',
      field: 'description',
      oldValue: existing.description ?? undefined,
      newValue: updates.description,
      userId,
    })
  }
  if (updates.color !== undefined && updates.color !== existing.color) {
    await createAuditLog({
      entityType: 'project',
      entityId: id,
      action: 'updated',
      field: 'color',
      oldValue: existing.color ?? undefined,
      newValue: updates.color,
      userId,
    })
  }

  return updated
}

async function deleteProject(id: string, userId: string) {
  // Verify access (throws if not found or no workspace access)
  await getProject(id, userId)

  // Audit log before deletion
  await createAuditLog({
    entityType: 'project',
    entityId: id,
    action: 'deleted',
    userId,
  })

  // Delete the project
  await db.delete(projects).where(eq(projects.id, id))
}

export const projectService = {
  listByOrg,
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
}
