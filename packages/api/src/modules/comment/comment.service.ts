import { db } from '../../db/connection'
import { comments, users, tasks, projects, sprints, workspaceMembers } from '../../db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { createAuditLog, auditFieldChange } from '../../shared/audit/audit.service'
import { TRPCError } from '@trpc/server'
import { taskService } from '../task/task.service'
import { sprintService } from '../sprint/sprint.service'
import { projectService } from '../project/project.service'
import { getMemberRole } from '../../trpc'
import { notificationService } from '../notification/notification.service'

/**
 * Resolve which workspace a comment's target entity belongs to.
 */
async function resolveEntityWorkspace(entityType: string, entityId: string): Promise<string> {
  if (entityType === 'task') {
    const [row] = await db
      .select({ projectId: tasks.projectId })
      .from(tasks)
      .where(eq(tasks.id, entityId))
      .limit(1)
    if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })
    const [project] = await db
      .select({ workspaceId: projects.workspaceId })
      .from(projects)
      .where(eq(projects.id, row.projectId))
      .limit(1)
    if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })
    return project.workspaceId
  }

  if (entityType === 'sprint') {
    const [row] = await db
      .select({ projectId: sprints.projectId })
      .from(sprints)
      .where(eq(sprints.id, entityId))
      .limit(1)
    if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Sprint not found' })
    const [project] = await db
      .select({ workspaceId: projects.workspaceId })
      .from(projects)
      .where(eq(projects.id, row.projectId))
      .limit(1)
    if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })
    return project.workspaceId
  }

  if (entityType === 'project') {
    const [row] = await db
      .select({ workspaceId: projects.workspaceId })
      .from(projects)
      .where(eq(projects.id, entityId))
      .limit(1)
    if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })
    return row.workspaceId
  }

  throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid entity type' })
}

async function list(entityType: string, entityId: string, userId: string) {
  // Verify entity access before listing comments
  if (entityType === 'task') await taskService.getTask(entityId, userId)
  else if (entityType === 'sprint') await sprintService.getSprint(entityId, userId)
  else if (entityType === 'project') await projectService.getProject(entityId, userId)
  else throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid entity type' })

  const rows = await db
    .select({
      id: comments.id,
      entityType: comments.entityType,
      entityId: comments.entityId,
      content: comments.content,
      authorId: comments.authorId,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(comments)
    .leftJoin(users, eq(comments.authorId, users.id))
    .where(and(eq(comments.entityType, entityType), eq(comments.entityId, entityId)))
    .orderBy(asc(comments.createdAt))

  return rows
}

async function create(
  input: { entityType: string; entityId: string; content: string },
  userId: string,
) {
  // Verify entity access
  if (input.entityType === 'task') await taskService.getTask(input.entityId, userId)
  else if (input.entityType === 'sprint') await sprintService.getSprint(input.entityId, userId)
  else if (input.entityType === 'project') await projectService.getProject(input.entityId, userId)
  else throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid entity type' })

  const [comment] = await db
    .insert(comments)
    .values({
      entityType: input.entityType,
      entityId: input.entityId,
      content: input.content,
      authorId: userId,
    })
    .returning()

  await createAuditLog({
    entityType: 'comment',
    entityId: comment.id,
    action: 'created',
    userId,
  })

  // Handle @mentions
  const mentionedUsernames = [
    ...new Set(
      Array.from(comment.content.matchAll(/@(\w+)/g)).map((m) => m[1]),
    ),
  ]

  if (mentionedUsernames.length > 0) {
    try {
      const workspaceId = await resolveEntityWorkspace(input.entityType, input.entityId)

      // Get author name
      const [author] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
      const authorName = author?.name || 'Someone'

      // Get workspace members with user details
      const members = await db
        .select({ userId: workspaceMembers.userId, name: users.name })
        .from(workspaceMembers)
        .innerJoin(users, eq(users.id, workspaceMembers.userId))
        .where(eq(workspaceMembers.workspaceId, workspaceId))

      for (const username of mentionedUsernames) {
        const matched = members.find(
          (m) => m.name?.toLowerCase() === username.toLowerCase(),
        )
        if (matched && matched.userId !== userId) {
          notificationService.notifyMentioned(
            input.entityType,
            input.entityId,
            matched.userId,
            authorName,
          )
        }
      }
    } catch (err) {
      console.error('Mention notification failed:', err)
    }
  }

  return comment
}

async function update(id: string, content: string, userId: string) {
  const [existing] = await db
    .select()
    .from(comments)
    .where(eq(comments.id, id))
    .limit(1)

  if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Comment not found' })

  // For now, allow any workspace member to edit (Phase 5 adds authorization)
  const [updated] = await db
    .update(comments)
    .set({ content, updatedAt: new Date() })
    .where(eq(comments.id, id))
    .returning()

  auditFieldChange('comment', id, userId, 'content', existing.content, content)

  return updated
}

async function deleteComment(id: string, userId: string) {
  const [existing] = await db
    .select()
    .from(comments)
    .where(eq(comments.id, id))
    .limit(1)

  if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Comment not found' })

  // Author can always delete their own comment
  if (existing.authorId !== userId) {
    // Otherwise, must be workspace admin/owner
    const workspaceId = await resolveEntityWorkspace(existing.entityType, existing.entityId)
    const role = await getMemberRole(userId, workspaceId)
    if (role !== 'admin' && role !== 'owner') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the author or an admin can delete this comment' })
    }
  }

  await createAuditLog({
    entityType: 'comment',
    entityId: id,
    action: 'deleted',
    userId,
  })

  await db.delete(comments).where(eq(comments.id, id))
}

export const commentService = { list, create, update, delete: deleteComment }