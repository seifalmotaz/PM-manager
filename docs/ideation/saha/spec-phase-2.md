# Implementation Spec: Saha - Phase 2

**Contract**: ./contract.md
**PRD**: ./prd-phase-2.md
**Estimated Effort**: L

## Technical Approach

Phase 2 delivers the core PM experience. We build workspace management (list, join via WorkOS, top-bar multi-select filter), project CRUD, the full task management system with NLP quick-add parsing, a drag-and-drop Kanban board, the compact task modal, and comprehensive audit logging infrastructure.

The backend follows the modular pattern from Phase 1. Each domain (workspace, project, task) gets its own tRPC router with Zod-validated procedures. The NLP parser remains a pure synchronous function — it accepts a raw string, extracts p0-p3/sp:N/@user/date patterns, strips them from the title, and returns a structured `ParsedTaskInput`. The task router exposes a `parse` query for frontend preview and `create` mutation that uses both parsed and raw inputs.

On the frontend, the Kanban board is the central reusable component. It renders 4 columns with draggable TaskCards. The same component is used on Home (with workspace/project filters) and in Project view. Drag-and-drop uses pointer events (not browser default drag) for mobile compatibility. The workspace filter dropdown in the top bar is a Svelte component reading from stores.

Audit logging is a shared service called by every mutation. Audit writes are fire-and-forget — they don't block the primary mutation.

## Feedback Strategy

**Inner-loop command**: `bun run --filter api test`

**Playground**: Test suite for NLP parser, audit service, service methods. Dev server for Kanban drag, modal, filter interaction.

**Why this approach**: The NLP parser, audit system, and service logic are deterministic — tests provide the fastest loop. UI components are interaction-heavy and best validated in the browser.

## File Changes

### New Files

| File Path | Purpose |
|---|---|
| `packages/api/src/modules/workspace/workspace.router.ts` | Workspace tRPC router: list, get, create company workspace, join via WorkOS |
| `packages/api/src/modules/workspace/workspace.service.ts` | Workspace logic: list user workspaces, auto-join via WorkOS org membership |
| `packages/api/src/modules/workspace/workspace.schema.ts` | Zod validation schemas |
| `packages/api/src/modules/workspace/workspace.type.ts` | Workspace-related types |
| `packages/api/src/modules/project/project.router.ts` | Project tRPC router: CRUD, list by workspace |
| `packages/api/src/modules/project/project.service.ts` | Project logic: create, update, delete, inbox auto-creation |
| `packages/api/src/modules/project/project.schema.ts` | Zod validation schemas |
| `packages/api/src/modules/project/project.type.ts` | Project types |
| `packages/api/src/modules/task/task.router.ts` | Task tRPC router: CRUD, status transitions, list with filters, NLP parse |
| `packages/api/src/modules/task/task.service.ts` | Task logic: NLP parser, status transitions, dwell time calculation |
| `packages/api/src/modules/task/task.schema.ts` | Zod validation schemas |
| `packages/api/src/modules/task/task.type.ts` | Task types |
| `packages/api/src/modules/task/nlp-parser.ts` | Natural language parser: extracts p0-p3, sp:N, @user, dates from raw string |
| `packages/api/src/modules/task/nlp-parser.spec.ts` | Parser unit tests |
| `packages/api/src/shared/audit/audit.service.ts` | Shared audit logging service |
| `packages/api/src/shared/audit/audit.spec.ts` | Audit service tests |
| `packages/web/src/lib/components/KanbanBoard.svelte` | Reusable Kanban: 4-column drag-and-drop board |
| `packages/web/src/lib/components/KanbanColumn.svelte` | Single column: header + droppable task list |
| `packages/web/src/lib/components/TaskCard.svelte` | Task display card |
| `packages/web/src/lib/components/TaskModal.svelte` | Compact task form modal |
| `packages/web/src/lib/components/QuickAddInput.svelte` | NLP inline input for fast task creation |
| `packages/web/src/lib/components/WorkspaceFilter.svelte` | Top-bar multi-select workspace dropdown |
| `packages/web/src/lib/components/DeadlineBadge.svelte` | Top-bar badge showing overdue count |
| `packages/web/src/lib/stores/workspaces.ts` | Svelte store: all workspaces, active filter IDs |
| `packages/web/src/lib/stores/tasks.ts` | Svelte store: current tasks, cache, loading state |
| `packages/web/src/routes/(app)/home/+page.svelte` | Home page: Kanban with workspace filter |
| `packages/web/src/routes/(app)/projects/+page.svelte` | Projects listing page |
| `packages/web/src/routes/(app)/project/[id]/+layout.svelte` | Project layout: Kanban + Sprints tabs |
| `packages/web/src/routes/(app)/project/[id]/kanban/+page.svelte` | Project Kanban view |
| `packages/web/src/routes/(app)/project/[id]/sprints/+page.svelte` | Project Sprint Board (stub for Phase 3) |

### Modified Files

| File Path | Changes |
|---|---|
| `packages/api/src/router.ts` | Merge workspace, project, task routers into `appRouter` |
| `packages/web/src/routes/(app)/+layout.svelte` | Wire WorkspaceFilter, DeadlineBadge into top bar; import stores |
| `packages/web/src/lib/trpc.ts` | No change — tRPC client auto-infers new routers from `AppRouter` type |

### Deleted Files

None.

## Implementation Details

### 1. NLP Parser

**Overview**: Pure synchronous function that accepts a raw input string and returns parsed task fields plus the cleaned title. No database calls — assignee resolution happens in the service layer.

```typescript
// nlp-parser.ts
export interface ParsedTaskInput {
  title: string
  priority?: 'p0' | 'p1' | 'p2' | 'p3'
  dueDate?: Date
  storyPoints?: number
  assigneeUsername?: string
}

export function parseTaskInput(input: string): ParsedTaskInput {
  let remaining = input

  // Extract priority: p0, p1, p2, p3 (case-insensitive, word boundary)
  const priorityMatch = remaining.match(/\bp([0-3])\b/i)
  const priority = priorityMatch
    ? `p${priorityMatch[1]}` as ParsedTaskInput['priority']
    : undefined
  if (priorityMatch) remaining = remaining.replace(priorityMatch[0], '')

  // Extract story points: sp:5, sp:0.5, sp:13
  const spMatch = remaining.match(/\bsp:(\d+(?:\.\d+)?)\b/i)
  const storyPoints = spMatch ? parseFloat(spMatch[1]) : undefined
  if (spMatch) remaining = remaining.replace(spMatch[0], '')

  // Extract assignee: @username
  const assigneeMatch = remaining.match(/@(\w+)/)
  const assigneeUsername = assigneeMatch ? assigneeMatch[1] : undefined
  if (assigneeMatch) remaining = remaining.replace(assigneeMatch[0], '')

  // Extract due date
  const datePatterns = [
    { pattern: /\btoday\b/i, getDate: () => new Date() },
    {
      pattern: /\btomorrow\b/i,
      getDate: () => {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        return d
      },
    },
    {
      pattern: /\byesterday\b/i,
      getDate: () => {
        const d = new Date()
        d.setDate(d.getDate() - 1)
        return d
      },
    },
    { pattern: /\b\d{4}-\d{2}-\d{2}\b/, getDate: (m: string) => new Date(m + 'T00:00:00') },
    {
      pattern: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      getDate: (m: string) => nextDayOfWeek(m),
    },
  ]

  let dueDate: Date | undefined
  for (const { pattern, getDate } of datePatterns) {
    const match = remaining.match(pattern)
    if (match) {
      dueDate = getDate(match[0])
      remaining = remaining.replace(match[0], '')
      break
    }
  }

  return {
    title: remaining.trim().replace(/\s+/g, ' '),
    priority,
    storyPoints,
    assigneeUsername,
    dueDate,
  }
}

function nextDayOfWeek(dayName: string): Date {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const target = days.indexOf(dayName.toLowerCase())
  const today = new Date()
  const current = today.getDay()
  let diff = target - current
  if (diff <= 0) diff += 7
  const result = new Date(today)
  result.setDate(today.getDate() + diff)
  result.setHours(0, 0, 0, 0)
  return result
}
```

**Key decisions**:
- Parser is pure, synchronous, no DB calls — assignee resolution (username → userId) happens in the service layer
- Only one of each token type extracted (first match wins)
- Day names resolve to the next occurrence (if today is Friday and input says "friday", that's today; if today is Friday and input says "monday", that's 3 days away)
- `YYYY-MM-DD` is parsed as midnight UTC of that date

**Implementation steps**:
1. Create `nlp-parser.ts` with `parseTaskInput` function
2. Implement `nextDayOfWeek` helper
3. Handle edge cases: empty string → `{ title: '' }`, only whitespace → `{ title: '' }`, mixed case tokens

**Feedback loop**:
- **Playground**: Write `nlp-parser.spec.ts` before/alongside implementation (TDD approach)
- **Experiment**: `"Fix bug p1"` → priority=p1, title="Fix bug". `"sp:3 p0 task"` → priority=p0, sp=3, title="task". `"No shortcuts here"` → title only. `"p1 tomorrow @seif sp:5 My task"` → all extracted, title="My task"
- **Check command**: `bun run --filter api test -- nlp-parser`

### 2. Audit Service

**Overview**: Shared service called by every mutation. Append-only writes to `audit_logs`. Fire-and-forget pattern — audit failures don't surface to the user.

```typescript
// shared/audit/audit.service.ts
import { db } from '../../db/connection'
import { auditLogs } from '../../db/schema'
import { z } from 'zod'

const AuditEntrySchema = z.object({
  entityType: z.enum(['task', 'project', 'sprint', 'workspace']),
  entityId: z.string().uuid(),
  action: z.enum(['created', 'updated', 'deleted', 'status_changed']),
  field: z.string().optional(),
  oldValue: z.string().optional(),
  newValue: z.string().optional(),
  userId: z.string().uuid(),
})

type AuditEntry = z.infer<typeof AuditEntrySchema>

export async function createAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      ...entry,
      createdAt: new Date(),
    })
  } catch (err) {
    // Fire-and-forget: audit failures must not break the primary operation
    console.error('Audit log write failed:', err)
  }
}

export function auditFieldChange(
  entityType: AuditEntry['entityType'],
  entityId: string,
  userId: string,
  field: string,
  oldValue: unknown,
  newValue: unknown,
): void {
  createAuditLog({
    entityType,
    entityId,
    action: 'updated',
    field,
    oldValue: oldValue !== undefined ? String(oldValue) : undefined,
    newValue: String(newValue),
    userId,
  })
}
```

**Key decisions**:
- Audit writes are wrapped in try/catch — they never throw
- Complex values stringified before storage
- `auditFieldChange` convenience function for update operations
- No query/read endpoint for audit logs in v1 (data stored, consumed in future UI)

**Implementation steps**:
1. Create `audit.service.ts` with `createAuditLog` and `auditFieldChange`
2. Integrate into task service on create, update, status change
3. Integrate into project and workspace services on create/update/delete

**Feedback loop**:
- **Playground**: Test through task creation flow
- **Experiment**: Create a task, query `audit_logs` table, verify entry with correct entityType, action, userId
- **Check command**: `bun run --filter api test -- audit`

### 3. Workspace Router & Service

**Overview**: Lists workspaces for authenticated user, supports company workspace creation and joining via WorkOS.

```typescript
// workspace.router.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { workspaceService } from './workspace.service'

export const workspaceRouter = router({
  list: protectedProcedure.query(({ ctx }) => {
    return workspaceService.listUserWorkspaces(ctx.user.id)
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input, ctx }) => {
      return workspaceService.getWorkspace(input.id, ctx.user.id)
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
      }),
    )
    .mutation(({ input, ctx }) => {
      return workspaceService.createCompanyWorkspace(input.name, ctx.user.id)
    }),

  members: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(({ input, ctx }) => {
      return workspaceService.listMembers(input.workspaceId, ctx.user.id)
    }),
})
```

```typescript
// workspace.service.ts
import { db } from '../../db/connection'
import { workspaces, workspaceMembers, users } from '../../db/schema'
import { eq, and } from 'drizzle-orm'
import { createAuditLog } from '../../shared/audit/audit.service'

async function listUserWorkspaces(userId: string) {
  const rows = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.userId, userId),
    with: {
      workspace: {
        with: {
          members: {
            columns: { id: true },
          },
        },
      },
    },
  })
  return rows.map((r) => ({
    ...r.workspace,
    memberCount: r.workspace.members.length,
  }))
}

async function getWorkspace(id: string, userId: string) {
  const member = await db.query.workspaceMembers.findFirst({
    where: and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.userId, userId)),
    with: { workspace: true },
  })
  if (!member) throw new Error('Workspace not found or access denied')
  return member.workspace
}

async function listMembers(workspaceId: string, userId: string) {
  // Verify membership
  await getWorkspace(workspaceId, userId)
  return db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.workspaceId, workspaceId),
    with: { user: true },
  })
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
```

**Implementation steps**:
1. Implement list (returns all workspaces user is a member of, with member counts)
2. Implement getWorkspace (with membership verification)
3. Implement createCompanyWorkspace (auto-adds creator as owner)
4. Implement listMembers (with membership verification)
5. Wire top-bar filter to workspace list from store

### 4. Project Router & Service

```typescript
// project.router.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { projectService } from './project.service'

export const projectRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid().optional(),
      }),
    )
    .query(({ input, ctx }) => {
      return projectService.listProjects(input.workspaceId, ctx.user.id)
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input, ctx }) => {
      return projectService.getProject(input.id, ctx.user.id)
    }),

  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      }),
    )
    .mutation(({ input, ctx }) => {
      return projectService.createProject(input, ctx.user.id)
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      }),
    )
    .mutation(({ input, ctx }) => {
      return projectService.updateProject(input.id, input, ctx.user.id)
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input, ctx }) => {
      return projectService.deleteProject(input.id, ctx.user.id)
    }),
})
```

```typescript
// project.service.ts
import { db } from '../../db/connection'
import { projects, tasks, workspaceMembers } from '../../db/schema'
import { eq, and } from 'drizzle-orm'
import { createAuditLog, auditFieldChange } from '../../shared/audit/audit.service'
import { workspaceService } from '../workspace/workspace.service'

async function listProjects(workspaceId: string | undefined, userId: string) {
  // Verify workspace membership
  if (workspaceId) await workspaceService.getWorkspace(workspaceId, userId)

  return db.query.projects.findMany({
    where: workspaceId ? eq(projects.workspaceId, workspaceId) : undefined,
    orderBy: (projects, { asc }) => [asc(projects.name)],
  })
}

async function getProject(id: string, userId: string) {
  const project = await db.query.projects.findFirst({ where: eq(projects.id, id) })
  if (!project) throw new Error('Project not found')
  await workspaceService.getWorkspace(project.workspaceId, userId) // verify membership
  return project
}

async function createProject(
  input: { workspaceId: string; name: string; description?: string; color?: string },
  userId: string,
) {
  await workspaceService.getWorkspace(input.workspaceId, userId)

  const [project] = await db.insert(projects).values(input).returning()

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
  const existing = await getProject(id, userId)

  const [updated] = await db
    .update(projects)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning()

  if (updates.name && updates.name !== existing.name) {
    auditFieldChange('project', id, userId, 'name', existing.name, updates.name)
  }
  if (updates.description !== undefined && updates.description !== existing.description) {
    auditFieldChange('project', id, userId, 'description', existing.description, updates.description)
  }
  if (updates.color !== undefined && updates.color !== existing.color) {
    auditFieldChange('project', id, userId, 'color', existing.color, updates.color)
  }

  return updated
}

async function deleteProject(id: string, userId: string) {
  await getProject(id, userId)

  await createAuditLog({
    entityType: 'project',
    entityId: id,
    action: 'deleted',
    userId,
  })

  await db.delete(projects).where(eq(projects.id, id))
}

export const projectService = {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
}
```

**Implementation steps**:
1. CRUD endpoints with workspace membership verification on every operation
2. Project list optionally filtered by workspaceId
3. Update compares old/new values and creates per-field audit entries
4. Delete removes the project (tasks cascade via FK)

### 5. Task Router & Service

```typescript
// task.router.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { taskService } from './task.service'
import { parseTaskInput } from './nlp-parser'

export const taskRouter = router({
  parse: protectedProcedure
    .input(z.object({ input: z.string() }))
    .query(({ input }) => {
      return parseTaskInput(input.input)
    }),

  list: protectedProcedure
    .input(
      z.object({
        workspaceIds: z.array(z.string().uuid()).optional(),
        projectId: z.string().uuid().optional(),
        sprintId: z.string().uuid().optional(),
        status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
        assigneeId: z.string().uuid().optional(),
      }),
    )
    .query(({ input, ctx }) => {
      return taskService.listTasks(input, ctx.user.id)
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input, ctx }) => {
      return taskService.getTask(input.id, ctx.user.id)
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        title: z.string().min(1).max(500),
        priority: z.enum(['p0', 'p1', 'p2', 'p3']).optional(),
        storyPoints: z.number().min(0).optional(),
        estimatedHours: z.number().min(0).optional(),
        assigneeId: z.string().uuid().optional(),
        dueDate: z.string().datetime().optional(),
        sprintId: z.string().uuid().optional(),
        description: z.string().optional(),
        sprintFlag: z.string().optional(),
      }),
    )
    .mutation(({ input, ctx }) => {
      return taskService.createTask(input, ctx.user.id)
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(500).optional(),
        priority: z.enum(['p0', 'p1', 'p2', 'p3']).nullable().optional(),
        storyPoints: z.number().min(0).nullable().optional(),
        estimatedHours: z.number().min(0).nullable().optional(),
        assigneeId: z.string().uuid().nullable().optional(),
        dueDate: z.string().datetime().nullable().optional(),
        deadline: z.string().datetime().nullable().optional(),
        sprintId: z.string().uuid().nullable().optional(),
        sprintFlag: z.string().nullable().optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(({ input, ctx }) => {
      return taskService.updateTask(input.id, input, ctx.user.id)
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input, ctx }) => {
      return taskService.deleteTask(input.id, ctx.user.id)
    }),

  changeStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['todo', 'in_progress', 'review', 'done']),
      }),
    )
    .mutation(({ input, ctx }) => {
      return taskService.changeStatus(input.id, input.status, ctx.user.id)
    }),

  home: protectedProcedure
    .input(
      z.object({
        workspaceIds: z.array(z.string().uuid()),
      }),
    )
    .query(({ input, ctx }) => {
      return taskService.listHome(input.workspaceIds, ctx.user.id)
    }),

  overdueCount: protectedProcedure.query(({ ctx }) => {
    return taskService.getOverdueCount(ctx.user.id)
  }),
})
```

```typescript
// task.service.ts (key functions)
import { db } from '../../db/connection'
import { tasks, projects, workspaceMembers } from '../../db/schema'
import { eq, and, inArray, lt, ne, gte, lte, isNull } from 'drizzle-orm'
import { createAuditLog, auditFieldChange } from '../../shared/audit/audit.service'
import { projectService } from '../project/project.service'

async function listTasks(
  filters: { workspaceIds?: string[]; projectId?: string; sprintId?: string; status?: string; assigneeId?: string },
  userId: string,
) {
  let conditions = []

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

  return db.query.tasks.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: { project: true },
    orderBy: (tasks, { asc }) => [asc(tasks.createdAt)],
  })
}

async function createTask(
  input: {
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
  },
  userId: string,
) {
  // Verify project access
  const project = await projectService.getProject(input.projectId, userId)

  const [task] = await db
    .insert(tasks)
    .values({
      ...input,
      status: 'todo',
      statusChangedAt: new Date(),
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    })
    .returning()

  await createAuditLog({
    entityType: 'task',
    entityId: task.id,
    action: 'created',
    userId,
  })

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
    if (value !== undefined && (task as any)[key] !== value) {
      updateData[key] = value
      auditFieldChange('task', id, userId, key, (task as any)[key], value)
    }
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
  if (newStatus !== 'done') {
    statusData.completedAt = null
  }

  const [updated] = await db
    .update(tasks)
    .set({ ...statusData, updatedAt: now })
    .where(eq(tasks.id, id))
    .returning()

  await createAuditLog({
    entityType: 'task',
    entityId: id,
    action: 'status_changed',
    field: 'status',
    oldValue: task.status,
    newValue: newStatus,
    userId,
  })

  if (task.status === 'done' && newStatus !== 'done') {
    await createAuditLog({
      entityType: 'task',
      entityId: id,
      action: 'updated',
      field: 'completedAt',
      oldValue: task.completedAt?.toISOString(),
      newValue: null,
      userId,
    })
  }

  return updated
}

async function getOverdueCount(userId: string) {
  const result = await db
    .select({ count: db.fn.count() })
    .from(tasks)
    .where(and(lt(tasks.deadline, new Date()), ne(tasks.status, 'done')))
  return result[0]?.count ?? 0
}

async function deleteTask(id: string, userId: string) {
  await getTask(id, userId)
  await createAuditLog({ entityType: 'task', entityId: id, action: 'deleted', userId })
  await db.delete(tasks).where(eq(tasks.id, id))
}
```

**Key decisions**:
- Status transitions are a dedicated `changeStatus` procedure with timestamp logic
- `parse` is a query (not mutation) — it's read-only, previews parsed fields
- Task list supports optional filters — unused filters are simply omitted from the query
- `home` procedure filters tasks by workspace IDs visible to the user
- Overdue count: tasks where `deadline < now` AND `status !== 'done'`

### 6. Root Router Update

```typescript
// packages/api/src/router.ts (updated)
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
```

### 7. Kanban Board (Svelte)

**Overview**: Reusable drag-and-drop Kanban with 4 columns. Used on Home and Project pages. Uses pointer events for drag behavior.

```svelte
<!-- KanbanBoard.svelte -->
<script lang="ts">
  import KanbanColumn from './KanbanColumn.svelte'
  import type { Task } from '$lib/types'

  export let tasks: Task[] = []
  export let onStatusChange: (taskId: string, newStatus: string) => Promise<void> = async () => {}
  export let onTaskClick: (task: Task) => void = () => {}

  const columns = [
    { id: 'todo', label: 'To Do' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'review', label: 'Review' },
    { id: 'done', label: 'Done' },
  ] as const

  $: tasksByColumn = Object.fromEntries(
    columns.map((col) => [col.id, tasks.filter((t) => t.status === col.id)]),
  )

  async function handleDrop(taskId: string, targetStatus: string) {
    await onStatusChange(taskId, targetStatus)
  }
</script>

<div class="kanban-board">
  {#each columns as column}
    <KanbanColumn
      title={column.label}
      tasks={tasksByColumn[column.id]}
      status={column.id}
      {onDrop}
      {onTaskClick}
    />
  {/each}
</div>

<style>
  .kanban-board {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    min-height: calc(100vh - 120px);
  }
</style>
```

**Key decisions**:
- Dragging uses `pointermove` events (not browser default `dragstart`/`dragend`) for mobile compatibility and finer control
- Dwell time computed as `now - statusChangedAt` displayed as "Xd" or "Xh" format
- Same KanbanBoard component reused for Home and Project pages

**Implementation steps**:
1. Create `KanbanColumn.svelte`: column header with title + count, droppable area with TaskCards
2. Create `TaskCard.svelte`: title, due date, priority badge (P0=red P1=orange P2=yellow P3=gray), project label, dwell time
3. Implement drag-and-drop using pointer event handling
4. On drop: call the `onStatusChange` callback → triggers `task.changeStatus.mutate()`
5. Compute dwell time from `statusChangedAt` field

**Feedback loop**:
- **Playground**: Dev server → Home page
- **Experiment**: Create 3 tasks, drag from To Do to In Progress, verify API call fires, verify dwell time updates. Drag to Done, verify card moves.
- **Check command**: `bun dev` (visual verification)

### 8. Task Modal

**Overview**: Compact modal with dominant title input and flex-row metadata chips.

```
┌──────────────────────────────────────────────┐
│  Fix login bug                               │ ← large title input
│                                              │
│  [P1 ▼] [Today ▼] [SP:3 ▼] [@ahmed ▼] [+Sprint] │ ← chips row
│                                              │
│  Deadline: [────────────]                     │
│                                              │
│  Description                                 │
│  ┌────────────────────────────────────────┐  │
│  │                                        │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  [Save] [Cancel] [Delete]                    │
└──────────────────────────────────────────────┘
```

**Implementation steps**:
1. Modal opens when clicking a TaskCard or "add with details" button
2. Each chip button opens a small dropdown/popover to change its value
3. Deadline is inline (not a chip) — distinguishes it from the due date
4. Changes call `task.update.mutate()` on each field change (optimistic or debounced)
5. Re-fetch tasks from store to update Kanban after mutation

**Feedback loop**:
- **Playground**: Dev server → click a task
- **Experiment**: Open task, change priority via chip → card updates immediately. Close and reopen → verify persisted.
- **Check command**: `bun dev` (visual)

### 9. Workspace Filter (Top Bar)

**Overview**: Multi-select dropdown with checkboxes.

```svelte
<!-- WorkspaceFilter.svelte -->
<script lang="ts">
  import { workspaces, activeFilterIds } from '$lib/stores/workspaces'

  let open = $state(false)

  function toggleWorkspace(id: string) {
    activeFilterIds.update((ids) => {
      if (ids.includes(id)) return ids.filter((i) => i !== id)
      return [...ids, id]
    })
  }

  function selectAll() {
    activeFilterIds.set($workspaces.map((w) => w.id))
  }

  function deselectAll() {
    activeFilterIds.set([])
  }
</script>

<button onclick={() => (open = !open)}>
  Workspaces ({$activeFilterIds.length})
</button>

{#if open}
  <div class="dropdown">
    <label>
      <input type="checkbox" checked={$activeFilterIds.length === $workspaces.length} onchange={selectAll} />
      All Workspaces
    </label>
    {#each $workspaces as ws}
      <label>
        <input type="checkbox" checked={$activeFilterIds.includes(ws.id)} onchange={() => toggleWorkspace(ws.id)} />
        {ws.name}
      </label>
    {/each}
  </div>
{/if}
```

**Implementation steps**:
1. Read workspaces from store (loaded on app mount via `+layout.svelte`)
2. Toggle filter IDs → trigger task re-fetch via reactive store
3. Session-reset: on new login, filter defaults to "All" (all workspace IDs selected)

### 10. Deadline Warning Badge

**Overview**: Persistent red badge in top bar showing count of overdue tasks.

```svelte
<!-- DeadlineBadge.svelte -->
<script lang="ts">
  import { overdueCount } from '$lib/stores/tasks'
</script>

{#if $overdueCount > 0}
  <span class="deadline-badge" title="{$overdueCount} tasks past deadline">
    {$overdueCount} overdue
  </span>
{/if}

<style>
  .deadline-badge {
    background: var(--color-danger, #ef4444);
    color: white;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
  }
</style>
```

**Implementation steps**:
1. Fetch `task.overdueCount` on app load and after any task mutation
2. Display red badge only when count > 0
3. Compute: tasks where `deadline < now` AND `status !== 'done'`

## API Design

All endpoints are tRPC procedures. The `AppRouter` type is auto-inferred and consumed by the frontend client.

### New Routers

| Router | Procedure | Type | Description |
|---|---|---|---|
| `workspace` | `list` | query (protected) | List all user's workspaces with member counts |
| `workspace` | `byId` | query (protected) | Get workspace details (verifies membership) |
| `workspace` | `create` | mutation (protected) | Create a company workspace |
| `workspace` | `members` | query (protected) | List members of a workspace |
| `project` | `list` | query (protected) | List projects (optional workspaceId filter) |
| `project` | `byId` | query (protected) | Get project detail |
| `project` | `create` | mutation (protected) | Create project in a workspace |
| `project` | `update` | mutation (protected) | Update project fields |
| `project` | `delete` | mutation (protected) | Delete project |
| `task` | `parse` | query (protected) | Parse NLP input, return structured preview |
| `task` | `list` | query (protected) | List tasks with filters (projectId, sprintId, status, assigneeId) |
| `task` | `byId` | query (protected) | Get task detail with relations |
| `task` | `create` | mutation (protected) | Create task (raw fields) |
| `task` | `update` | mutation (protected) | Update task fields |
| `task` | `delete` | mutation (protected) | Delete task |
| `task` | `changeStatus` | mutation (protected) | Transition task status with timestamp management |
| `task` | `home` | query (protected) | List tasks for Home page (filtered by workspaceIds) |
| `task` | `overdueCount` | query (protected) | Get count of tasks past deadline |

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|---|---|
| `packages/api/src/modules/task/nlp-parser.spec.ts` | All parser patterns, edge cases, empty input |
| `packages/api/src/shared/audit/audit.spec.ts` | Audit entry creation, field mapping |
| `packages/api/src/modules/workspace/workspace.service.spec.ts` | List, create, membership verification |
| `packages/api/src/modules/task/task.service.spec.ts` | Create, update, status transitions, dwell time |

**Key test cases**:
- NLP parser: `""` → `{ title: "" }`
- NLP parser: `"task p1"` → title="task", priority="p1"
- NLP parser: `"p0 sp:13 @ahmed tomorrow Review UI"` → all extracted, title="Review UI"
- NLP parser: `"sp:0.5 small task"` → storyPoints=0.5, title="small task"
- NLP parser: `"monday task"` → dueDate = next Monday occurrence
- Status transition: `todo → in_progress` sets `startedAt`
- Status transition: `in_progress → done` sets `completedAt`
- Status transition: `done → in_progress` clears `completedAt`, audit logged
- Audit: task creation generates `created` entry
- Audit: task update generates per-field `updated` entries with old/new values

### Integration Tests

| Test File | Coverage |
|---|---|
| `packages/api/src/modules/task/task.integration.spec.ts` | Full task lifecycle: create → update → status changes → delete |
| `packages/api/src/modules/workspace/workspace.integration.spec.ts` | Workspace creation with member management |

### Manual Testing

- [ ] Type `"Fix bug p1 tomorrow sp:3"` in quick-add → task appears in To Do with all fields
- [ ] Type `"Just a title"` → task appears with title only
- [ ] Drag task To Do → In Progress → dwell time appears on card
- [ ] Drag In Progress → Review → Review → Done
- [ ] Set deadline to yesterday → top bar shows "1 overdue"
- [ ] Open task modal → change priority via chip → card updates
- [ ] Open workspace filter → uncheck a workspace → tasks disappear from kanban
- [ ] Create project → appears on Projects page
- [ ] Project kanban tab shows only that project's tasks

## Error Handling

| Error Scenario | Handling Strategy |
|---|---|
| NLP input is only whitespace | Return `TRPCError({ code: 'BAD_REQUEST', message: 'Title is required' })` |
| Task update on deleted task | Return `TRPCError({ code: 'NOT_FOUND' })` |
| Invalid status transition | Return `TRPCError({ code: 'BAD_REQUEST', message: 'Invalid status transition' })` |
| Assignee not a workspace member | Return `TRPCError({ code: 'BAD_REQUEST', message: 'User is not a workspace member' })` |
| Project creation without workspaceId | Return `TRPCError({ code: 'BAD_REQUEST', message: 'workspaceId is required' })` |
| Concurrent task updates | Last-write-wins (no optimistic locking in v1) |
| Unauthorized access to resource | `protectedProcedure` middleware rejects; service layer also verifies membership |

## Failure Modes

| Component | Failure Mode | Trigger | Impact | Mitigation |
|---|---|---|---|---|
| NLP Parser | Silent token consumption | User types "sp:3" meaning something else | Story points incorrectly set to 3 | Accept risk — token vocabulary is narrow |
| NLP Parser | Date ambiguity | User types "friday" on Friday | Next occurrence = today (expected behavior) | Document resolution rules |
| KanbanBoard | Optimistic UI rollback | User drags, API call fails, snap back | Brief visual glitch | Implement optimistic update + rollback; show toast "Failed to move task" |
| Audit | Silent failure | DB error during audit write | Task updated but no log entry | Fire-and-forget with try/catch — accept rare gaps |
| Workspace Filter | Session reset on refresh | Browser refresh clears activeFilters store | Filter resets to "All" | Documented session-reset behavior |
| tRPC Client | Type drift | Backend router changes without frontend rebuild | Compile-time type error caught | TypeScript catches mismatches at build time |

## Validation Commands

```bash
# Type checking
bun run --filter '*' typecheck

# API tests (NLP parser, audit, services)
bun run --filter api test

# Dev server
bun dev
```

## Open Items

- [ ] Determine workspace filter persistence: cookie vs. query params vs. localStorage (currently: session-reset)
- [ ] Define exact dwell time display format: "3d" vs "3 days" vs "72h"
- [ ] Decide: should task.parse be a query or mutation? (Current: query — it's read-only)
- [ ] Define pagination strategy for task.list (v1: return all; future: cursor-based)

---

_This spec is ready for implementation. Follow the patterns and validate at each step._
