# Implementation Spec: Saha - Phase 3

**Contract**: ./contract.md
**PRD**: ./prd-phase-3.md
**Estimated Effort**: M

## Technical Approach

Phase 3 adds the sprint layer on top of the task and project infrastructure from Phase 2. The Sprint module provides CRUD with flexible date ranges and automatic status transitions. The Sprint Board is a horizontal Kanban-like layout — each sprint is a column, plus a "Backlog" column for unassigned tasks. Drag-and-drop reuses the pointer-event pattern from the Kanban board, adapted for horizontal movement between sprint columns.

Sprint flags live on the `tasks` table as a nullable text field (`sprintFlag`). Null means "planned" (task was part of the original sprint plan). Any string means "unplanned" with context. Sprint locking is enforced at write time — any task assignment to a completed sprint is rejected.

Zero new database tables are required. Everything uses the existing `sprints`, `tasks`, and `audit_logs` tables.

## Feedback Strategy

**Inner-loop command**: `bun run --filter api test`

**Playground**: Test suite for sprint logic (auto-status, locking, flag rules). Dev server for Sprint Board interaction.

**Why this approach**: Sprint logic is deterministic (status transitions, locking rules). Sprint Board is an interaction-heavy UI component.

## File Changes

### New Files

| File Path | Purpose |
|---|---|
| `packages/api/src/modules/sprint/sprint.router.ts` | Sprint tRPC router: CRUD, list by project |
| `packages/api/src/modules/sprint/sprint.service.ts` | Sprint logic: auto-status, locking, planned points snapshot |
| `packages/api/src/modules/sprint/sprint.schema.ts` | Zod validation schemas |
| `packages/api/src/modules/sprint/sprint.type.ts` | Sprint types |
| `packages/web/src/lib/components/SprintBoard.svelte` | Horizontal sprint columns + Backlog, drag-and-drop |
| `packages/web/src/lib/components/SprintColumn.svelte` | Single sprint column: header + task list |
| `packages/web/src/lib/components/SprintTaskCard.svelte` | Task card for sprint columns |

### Modified Files

| File Path | Changes |
|---|---|
| `packages/api/src/router.ts` | Merge sprint router into `appRouter` |
| `packages/api/src/modules/task/task.service.ts` | Add sprint flag handling; enforce sprint lock check on assignment |
| `packages/api/src/modules/task/task.router.ts` | Add sprintFlag to create/update input schemas |
| `packages/web/src/routes/(app)/project/[id]/sprints/+page.svelte` | Sprint Board page (replaces stub) |
| `packages/web/src/routes/(app)/project/[id]/+layout.svelte` | Make Sprints tab functional |

### Deleted Files

None.

## Implementation Details

### 1. Sprint Router & Service

**Overview**: CRUD for sprints with automatic status computation and lock enforcement.

```typescript
// sprint.router.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { sprintService } from './sprint.service'

export const sprintRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(({ input, ctx }) => {
      return sprintService.listByProject(input.projectId, ctx.user.id)
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input, ctx }) => {
      return sprintService.getSprint(input.id, ctx.user.id)
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        name: z.string().min(1).max(200),
        goal: z.string().optional(),
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
      }),
    )
    .mutation(({ input, ctx }) => {
      return sprintService.createSprint(input, ctx.user.id)
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        goal: z.string().optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
      }),
    )
    .mutation(({ input, ctx }) => {
      return sprintService.updateSprint(input.id, input, ctx.user.id)
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input, ctx }) => {
      return sprintService.deleteSprint(input.id, ctx.user.id)
    }),
})
```

```typescript
// sprint.service.ts
import { db } from '../../db/connection'
import { sprints, tasks } from '../../db/schema'
import { eq, and, isNull, sql } from 'drizzle-orm'
import { createAuditLog, auditFieldChange } from '../../shared/audit/audit.service'
import { projectService } from '../project/project.service'
import type { Sprint } from './sprint.type'

function getSprintStatus(sprint: Pick<Sprint, 'startDate' | 'endDate'>): 'planned' | 'active' | 'completed' {
  const now = new Date()
  if (now > new Date(sprint.endDate)) return 'completed'
  if (now >= new Date(sprint.startDate)) return 'active'
  return 'planned'
}

function isSprintLocked(sprint: Pick<Sprint, 'startDate' | 'endDate'>): boolean {
  return getSprintStatus(sprint) === 'completed'
}

async function listByProject(projectId: string, userId: string) {
  await projectService.getProject(projectId, userId)

  const allSprints = await db.query.sprints.findMany({
    where: eq(sprints.projectId, projectId),
    orderBy: (sprints, { asc }) => [asc(sprints.startDate)],
  })

  // Lazily update status for any sprints whose dates have passed
  return Promise.all(
    allSprints.map(async (sprint) => {
      const computedStatus = getSprintStatus(sprint)
      if (computedStatus !== sprint.status) {
        const [updated] = await db
          .update(sprints)
          .set({
            status: computedStatus,
            ...(computedStatus === 'completed'
              ? { plannedPoints: await computePlannedPoints(sprint.id) }
              : {}),
            updatedAt: new Date(),
          })
          .where(eq(sprints.id, sprint.id))
          .returning()
        return updated
      }
      return sprint
    }),
  )
}

async function getSprint(id: string, userId: string) {
  const sprint = await db.query.sprints.findFirst({
    where: eq(sprints.id, id),
    with: { project: true },
  })
  if (!sprint) throw new Error('Sprint not found')

  // Verify project access
  await projectService.getProject(sprint.projectId, userId)

  // Lazy status update
  const computedStatus = getSprintStatus(sprint)
  if (computedStatus !== sprint.status) {
    const updateData: Record<string, unknown> = { status: computedStatus, updatedAt: new Date() }
    if (computedStatus === 'completed') {
      updateData.plannedPoints = await computePlannedPoints(sprint.id)
    }
    const [updated] = await db
      .update(sprints)
      .set(updateData)
      .where(eq(sprints.id, id))
      .returning()
    return updated
  }

  return sprint
}

async function createSprint(
  input: { projectId: string; name: string; goal?: string; startDate: string; endDate: string },
  userId: string,
) {
  await projectService.getProject(input.projectId, userId)

  if (new Date(input.startDate) >= new Date(input.endDate)) {
    throw new Error('Start date must be before end date')
  }

  const initialStatus = getSprintStatus({
    startDate: new Date(input.startDate),
    endDate: new Date(input.endDate),
  })

  const [sprint] = await db
    .insert(sprints)
    .values({
      ...input,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      status: initialStatus,
    })
    .returning()

  await createAuditLog({
    entityType: 'sprint',
    entityId: sprint.id,
    action: 'created',
    userId,
  })

  return sprint
}

async function updateSprint(
  id: string,
  updates: { name?: string; goal?: string; startDate?: string; endDate?: string },
  userId: string,
) {
  const existing = await getSprint(id, userId)

  if (existing.status === 'completed') {
    throw new Error('Cannot modify a completed sprint')
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() }

  if (updates.name && updates.name !== existing.name) {
    updateData.name = updates.name
    auditFieldChange('sprint', id, userId, 'name', existing.name, updates.name)
  }
  if (updates.goal !== undefined && updates.goal !== existing.goal) {
    updateData.goal = updates.goal
    auditFieldChange('sprint', id, userId, 'goal', existing.goal, updates.goal)
  }
  if (updates.startDate) {
    updateData.startDate = new Date(updates.startDate)
    auditFieldChange('sprint', id, userId, 'startDate', existing.startDate.toISOString(), updates.startDate)
  }
  if (updates.endDate) {
    updateData.endDate = new Date(updates.endDate)
    auditFieldChange('sprint', id, userId, 'endDate', existing.endDate.toISOString(), updates.endDate)
  }

  if (Object.keys(updateData).length > 1) {
    const [updated] = await db
      .update(sprints)
      .set(updateData)
      .where(eq(sprints.id, id))
      .returning()
    return updated
  }

  return existing
}

async function deleteSprint(id: string, userId: string) {
  const sprint = await getSprint(id, userId)

  // Unassign tasks (set sprintId to null)
  await db.update(tasks).set({ sprintId: null }).where(eq(tasks.sprintId, id))

  await createAuditLog({
    entityType: 'sprint',
    entityId: id,
    action: 'deleted',
    userId,
  })

  await db.delete(sprints).where(eq(sprints.id, id))
}

async function computePlannedPoints(sprintId: string): Promise<number> {
  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${tasks.storyPoints}), 0)`,
    })
    .from(tasks)
    .where(and(eq(tasks.sprintId, sprintId), isNull(tasks.sprintFlag)))

  return Number(result[0]?.total) || 0
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
```

**Key decisions**:
- Sprint status is computed from dates, not stored immutably — the DB column exists for query efficiency but is updated lazily
- When sprint transitions to "completed", `plannedPoints` is computed (sum of SP for tasks with `sprintFlag = null`)
- Locked sprints cannot be edited or receive new tasks
- Delete unassigns tasks (sets `sprintId = null`) rather than cascade-deleting

**Implementation steps**:
1. Create sprint: validate `startDate < endDate`, compute initial status
2. Read sprint: lazy status update if dates have passed
3. Update sprint: only allow on non-completed sprints
4. Delete sprint: unassign all tasks, then remove
5. List: returns all sprints for project, lazily updates statuses

**Feedback loop**:
- **Playground**: Test via API tests
- **Experiment**: Create sprint with past dates → status = "active" or "completed". Future dates → "planned". Middle → "active"
- **Check command**: `bun run --filter api test -- sprint`

### 2. Sprint Flag Handling in Task Module

**Overview**: When a task is assigned to an active sprint, `sprintFlag` can be set. The service enforces sprint locking on assignment. Update the existing task router schemas.

```typescript
// task.router.ts — add to create input:
sprintFlag: z.string().min(1).optional(),

// task.router.ts — add to update input:
sprintFlag: z.string().min(1).nullable().optional(),
```

```typescript
// task.service.ts — add sprint lock check to createTask and updateTask
import { sprintService } from '../sprint/sprint.service'

// In createTask, after verifying project:
if (input.sprintId) {
  const sprint = await sprintService.getSprint(input.sprintId, userId)
  if (sprintService.isSprintLocked(sprint)) {
    throw new Error('Cannot assign tasks to a completed sprint')
  }
  // If sprint is active and no flag provided, keep null (planned)
}

// In updateTask, when sprintId changes:
if (updates.sprintId !== undefined) {
  if (updates.sprintId) {
    const sprint = await sprintService.getSprint(updates.sprintId as string, userId)
    if (sprintService.isSprintLocked(sprint)) {
      throw new Error('Cannot assign tasks to a completed sprint')
    }
  }
}
```

**Key decisions**:
- Null `sprintFlag` means "planned before sprint start"
- Any non-null string = "added mid-sprint with context"
- When moving a task between sprints, `sprintFlag` is preserved unless explicitly changed
- Sprint flag is free-text — no validation on content

**Implementation steps**:
1. Add `sprintFlag` to task create and update Zod schemas
2. Validate sprint is not locked before assignment
3. When task created into active sprint without explicit flag → default to null
4. Audit log sprint flag changes

### 3. Sprint Board (Svelte)

**Overview**: Horizontal scrollable board where each sprint is a column, plus a Backlog column. Drag tasks between sprint columns.

```svelte
<!-- SprintBoard.svelte -->
<script lang="ts">
  import SprintColumn from './SprintColumn.svelte'
  import type { Sprint, Task } from '$lib/types'

  export let sprints: Sprint[] = []
  export let tasks: Task[] = []
  export let onSprintChange: (taskId: string, newSprintId: string | null) => Promise<void> = async () => {}

  $: activeSprints = sprints.filter((s) => s.status !== 'completed')
  $: completedSprints = sprints.filter((s) => s.status === 'completed')
  $: backlogTasks = tasks.filter((t) => !t.sprintId)

  function tasksForSprint(sprintId: string): Task[] {
    return tasks.filter((t) => t.sprintId === sprintId)
  }
</script>

<div class="sprint-board-wrapper">
  <div class="sprint-board">
    <!-- Backlog column -->
    <SprintColumn
      title="Backlog"
      status="backlog"
      tasks={backlogTasks}
      onDrop={(taskId) => onSprintChange(taskId, null)}
      locked={false}
    />

    <!-- Active + Planned sprints -->
    {#each activeSprints as sprint}
      <SprintColumn
        title={sprint.name}
        subtitle={`${new Date(sprint.startDate).toLocaleDateString()} — ${new Date(sprint.endDate).toLocaleDateString()}`}
        status={sprint.status}
        tasks={tasksForSprint(sprint.id)}
        taskCount={tasksForSprint(sprint.id).length}
        onDrop={(taskId) => onSprintChange(taskId, sprint.id)}
        locked={sprintService.isSprintLocked(sprint)}
        sprintId={sprint.id}
      />
    {/each}

    <!-- Completed sprints (dimmed, locked) -->
    {#each completedSprints as sprint}
      <SprintColumn
        title={sprint.name}
        subtitle={`Completed`}
        status="completed"
        tasks={tasksForSprint(sprint.id)}
        taskCount={tasksForSprint(sprint.id).length}
        onDrop={() => {}}  {/* no-op — locked */}
        locked={true}
        sprintId={sprint.id}
      />
    {/each}
  </div>
</div>

<style>
  .sprint-board-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .sprint-board {
    display: flex;
    gap: 1rem;
    min-height: calc(100vh - 200px);
    padding-bottom: 1rem;
  }
</style>
```

**Key decisions**:
- Horizontal scroll via `overflow-x: auto` (native scrolling, no custom controls)
- Backlog is a synthetic column — tasks dropped there get `sprintId = null`
- Completed sprints are visually dimmed and refuse drops (drop handler is no-op)
- Task status is preserved when moving between sprints — drag changes `sprintId` only

**Implementation steps**:
1. Create `SprintBoard.svelte` container with horizontal flex
2. Create `SprintColumn.svelte`: sprint header (name, date range, task count, status badge) + droppable task list
3. Create `SprintTaskCard.svelte`: compact card (title, assignee name, due date, priority badge, status badge, sprint flag if set)
4. Implement drag-and-drop using pointer events (same pattern as Kanban)
5. On drop: call `task.update.mutate({ id, sprintId })`
6. Handle Backlog: dropping sets `sprintId = null`

**Feedback loop**:
- **Playground**: Dev server → Project → Sprints tab
- **Experiment**: Create 2 sprints. Assign tasks. Drag task Sprint 1 → Sprint 2, verify moves. Drag to Backlog, verify sprintId cleared. Drag to completed sprint, verify rejected.
- **Check command**: `bun dev` (visual)

### 4. Project Sprints Page

```svelte
<!-- project/[id]/sprints/+page.svelte -->
<script lang="ts">
  import { trpc } from '$lib/trpc'
  import SprintBoard from '$lib/components/SprintBoard.svelte'

  let { data } = $props()

  let sprints = $state(data.sprints)
  let tasks = $state(data.tasks)

  async function handleSprintChange(taskId: string, newSprintId: string | null) {
    try {
      await trpc.task.update.mutate({ id: taskId, sprintId: newSprintId })
      // Optimistic: move task in local state
      tasks = tasks.map((t) => (t.id === taskId ? { ...t, sprintId: newSprintId } : t))
    } catch (err) {
      console.error('Failed to move task:', err)
    }
  }
</script>

<SprintBoard {sprints} {tasks} onSprintChange={handleSprintChange} />
```

**Page load** (in `+page.ts`):
```typescript
export async function load({ params }) {
  const sprints = await trpc.sprint.list.query({ projectId: params.id })
  const tasks = await trpc.task.list.query({ projectId: params.id })
  return { sprints, tasks }
}
```

## API Design

| Procedure | Type | Description |
|---|---|---|
| `sprint.list` | query (protected) | List sprints for project (lazy status update) |
| `sprint.byId` | query (protected) | Get sprint detail with lazy status check |
| `sprint.create` | mutation (protected) | Create sprint (name, startDate, endDate, optional goal) |
| `sprint.update` | mutation (protected) | Update sprint (rejected if completed) |
| `sprint.delete` | mutation (protected) | Delete sprint (unassigns tasks) |

**Task endpoint additions**: The existing `task.create` and `task.update` procedures accept `sprintFlag` and enforce sprint locking.

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|---|---|
| `packages/api/src/modules/sprint/sprint.service.spec.ts` | Status computation, locking, planned points |

**Key test cases**:
- Sprint with endDate in past → status = "completed", locked = true
- Sprint with startDate in future → status = "planned", locked = false
- Sprint with current date between → status = "active", locked = false
- Task assignment to locked sprint → throws error
- Planned points sum excludes tasks with non-null `sprintFlag`
- Sprint delete clears `sprintId` on associated tasks
- Create sprint with startDate after endDate → validation error

### Manual Testing

- [ ] Create sprint "Sprint 1" with future dates → appears as "planned" column
- [ ] Create sprint "Sprint 2" with overlapping dates → appears as second column
- [ ] Backlog column shows tasks without sprint
- [ ] Drag task from Backlog into Sprint 1 → task appears in Sprint 1
- [ ] Verify task's status unchanged after sprint move
- [ ] Set task's sprintFlag to "unscheduled" → visible on card
- [ ] Sprint Board horizontally scrollable with 3+ sprints
- [ ] Completed sprint visually dimmed
- [ ] Cannot drag into completed sprint

## Error Handling

| Error Scenario | Handling Strategy |
|---|---|
| Sprint with startDate ≥ endDate | Throw `Error('Start date must be before end date')` (Zod catches at input) |
| Task assignment to completed sprint | Throw `Error('Cannot assign tasks to a completed sprint')` |
| Sprint update after completion | Throw `Error('Cannot modify a completed sprint')` |
| Sprint delete with active tasks | Unassign silently (no warning dialog — v1 simplicity) |
| Drag to completed sprint | Rejected client-side, no API call |

## Failure Modes

| Component | Failure Mode | Trigger | Impact | Mitigation |
|---|---|---|---|---|
| Sprint Status | Stale DB status | End date passes but sprint not read | Sprint appears active when completed | Lazy update on any read |
| Sprint Lock | Race condition | Two users assign tasks as sprint locks | One slips through | Accept for v1 (rare) |
| Sprint Flag | Flag loss on move | User drags without noticing flag cleared | Context lost | Preserve sprintFlag unless explicitly changed |
| Sprint Board | Overscroll on many sprints | 10+ columns | Poor UX | Accept for v1; future: collapse completed |

## Validation Commands

```bash
bun run --filter '*' typecheck
bun run --filter api test -- sprint
bun dev
```

## Open Items

- [ ] Sprint creation: auto-compute plannedPoints at creation or at lock? (At lock time — allows editing before start)
- [ ] Completed sprints: collapsed by default? (No — v1 shows all)

---

_This spec is ready for implementation. Follow the patterns and validate at each step._
