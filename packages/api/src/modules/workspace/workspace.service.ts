import { db } from '../../db/connection'
import { workspaces, workspaceMembers, users } from '../../db/schema'
import { eq, and, count, sql } from 'drizzle-orm'
import { createAuditLog } from '../../shared/audit/audit.service'

async function listUserWorkspaces(userId: string) {
  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      type: workspaces.type,
      organizationId: workspaces.organizationId,
      createdBy: workspaces.createdBy,
      createdAt: workspaces.createdAt,
      updatedAt: workspaces.updatedAt,
      memberCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${workspaceMembers}
        WHERE ${workspaceMembers.workspaceId} = ${workspaces.id}
      )`,
    })
    .from(workspaces)
    .innerJoin(
      workspaceMembers,
      eq(workspaceMembers.workspaceId, workspaces.id),
    )
    .where(eq(workspaceMembers.userId, userId))

  return rows
}

async function getWorkspace(id: string, userId: string) {
  const [member] = await db
    .select({
      workspace: workspaces,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(
      and(
        eq(workspaceMembers.workspaceId, id),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .limit(1)

  if (!member) throw new Error('Workspace not found or access denied')
  return member.workspace
}

async function listMembers(workspaceId: string, userId: string) {
  // Verify membership first
  await getWorkspace(workspaceId, userId)

  const members = await db
    .select({
      id: workspaceMembers.id,
      workspaceId: workspaceMembers.workspaceId,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.joinedAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspaceId))

  return members.map((m) => ({
    id: m.id,
    workspaceId: m.workspaceId,
    userId: m.userId,
    role: m.role,
    joinedAt: m.joinedAt,
    user: m.user,
  }))
}

async function createCompanyWorkspace(name: string, userId: string) {
  const slug = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()

  const [workspace] = await db
    .insert(workspaces)
    .values({ name, slug, type: 'company', createdBy: userId })
    .returning()

  await db.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId,
    role: 'owner',
  })

  await createAuditLog({
    entityType: 'workspace',
    entityId: workspace.id,
    action: 'created',
    userId,
  })

  return workspace
}

export const workspaceService = {
  listUserWorkspaces,
  getWorkspace,
  listMembers,
  createCompanyWorkspace,
}
