# Implementation Spec: Saha - Phase 4

**Contract**: ./contract.md
**PRD**: ./prd-phase-4.md
**Estimated Effort**: M

## Technical Approach

Phase 4 delivers the analytical engine that makes Saha a real PM tool. The velocity computation engine is a shared service that accepts a date range and optional filters, then computes completed points from `completedAt` timestamps (not sprint ownership). The same formula powers three view modes: Live (sprint start → now), Snapshot (sprint start → sprint end, completed sprints only), and Custom Range (any dates).

Two velocity pages are built: workspace-level (aggregated across projects) and global (aggregated across workspaces). Both reuse a shared `VelocityView` Svelte component parameterized by filter context. The Capacity sub-tab lives inside the Sprint Board — it reads workspace members, sums their estimated hours vs. capacity, and flags overloads.

No new database tables are needed. Capacity data uses the existing `employee_capacity` table. Velocity is computed purely from `tasks` and `sprints` data.

## Feedback Strategy

**Inner-loop command**: `bun run --filter api test`

**Playground**: Test suite for velocity computation and capacity logic. Dev server for velocity pages and capacity table interaction.

**Why this approach**: Velocity and capacity are pure math — tests provide the fastest, most reliable feedback loop.

## File Changes

### New Files

| File Path | Purpose |
|---|---|
| `packages/api/src/shared/velocity/velocity.service.ts` | Velocity engine: compute completed/planned/over-velocity for date ranges |
| `packages/api/src/shared/velocity/velocity.router.ts` | Velocity tRPC router: live, snapshot, custom |
| `packages/api/src/shared/velocity/velocity.spec.ts` | Velocity engine unit tests |
| `packages/api/src/modules/sprint/capacity.router.ts` | Capacity tRPC router: get/set capacity per sprint per employee |
| `packages/api/src/modules/sprint/capacity.service.ts` | Capacity logic: overload detection |
| `packages/web/src/lib/components/VelocityView.svelte` | Reusable velocity display (metrics + flagged tasks) |
| `packages/web/src/lib/components/VelocityModeSelector.svelte` | Mode switcher: Live / Snapshot / Custom Range |
| `packages/web/src/lib/components/CapacityTable.svelte` | Per-sprint employee capacity grid |
| `packages/web/src/routes/(app)/velocity/+page.svelte` | Global velocity page (cross-workspace) |
| `packages/web/src/routes/(app)/workspace/[id]/velocity/+page.svelte` | Workspace velocity page (cross-project) |

### Modified Files

| File Path | Changes |
|---|---|
| `packages/api/src/router.ts` | Merge velocity and capacity routers |
| `packages/web/src/routes/(app)/project/[id]/sprints/+page.svelte` | Add Board / Capacity sub-tabs |
| `packages/web/src/routes/(app)/+layout.svelte` | Wire Velocity sidebar link to global velocity page |

### Deleted Files

None.

## Implementation Details

### 1. Velocity Engine

**Overview**: Pure async service. Given a date range and optional filters, queries completed tasks and returns velocity metrics.

```typescript
// shared/velocity/velocity.service.ts
import { z } from 'zod'
import { db } from '../../db/connection'
import { tasks, projects } from '../../db/schema'
import { eq, and, gte, lte, inArray, isNull } from 'drizzle-orm'

export const VelocityInputSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  workspaceIds: z.array(z.string().uuid()).optional(),
  projectIds: z.array(z.string().uuid()).optional(),
  sprintId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
})

export type VelocityInput = z.infer<typeof VelocityInputSchema>

export interface VelocityResult {
  completedPoints: number
  plannedPoints?: number
  overVelocity?: number
  flaggedTasks: Array<{
    taskId: string
    title: string
    storyPoints: number
    sprintFlag: string
    completedAt: Date
  }>
  taskCount: number
}

export async function computeVelocity(input: VelocityInput): Promise<VelocityResult> {
  // Base: tasks completed within date range
  let conditions = [
    gte(tasks.completedAt, input.startDate),
    lte(tasks.completedAt, input.endDate),
    eq(tasks.status, 'done'),
  ]

  if (input.projectIds?.length) {
    conditions.push(inArray(tasks.projectId, input.projectIds))
  }

  if (input.workspaceIds?.length) {
    // Join through projects → workspaces
    const workspaceProjectIds = await db
      .select({ id: projects.id })
      .from(projects)
      .where(inArray(projects.workspaceId, input.workspaceIds))

    const ids = workspaceProjectIds.map((p) => p.id)
    if (ids.length > 0) {
      conditions.push(inArray(tasks.projectId, ids))
    } else {
      // No matching projects → return zero result
      return { completedPoints: 0, flaggedTasks: [], taskCount: 0 }
    }
  }

  if (input.userId) {
    conditions.push(eq(tasks.assigneeId, input.userId))
  }

  const completedTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      storyPoints: tasks.storyPoints,
      sprintFlag: tasks.sprintFlag,
      sprintId: tasks.sprintId,
      completedAt: tasks.completedAt,
    })
    .from(tasks)
    .where(and(...conditions))

  const completedPoints = completedTasks.reduce(
    (sum, t) => sum + Number(t.storyPoints || 0),
    0,
  )

  // Planned points (only when sprintId provided)
  let plannedPoints: number | undefined
  let overVelocity: number | undefined

  if (input.sprintId) {
    const plannedTasks = await db
      .select({ storyPoints: tasks.storyPoints })
      .from(tasks)
      .where(and(eq(tasks.sprintId, input.sprintId), isNull(tasks.sprintFlag)))

    plannedPoints = plannedTasks.reduce(
      (sum, t) => sum + Number(t.storyPoints || 0),
      0,
    )

    overVelocity = plannedPoints > 0 ? completedPoints / plannedPoints : undefined
  }

  const flaggedTasks = completedTasks
    .filter((t) => t.sprintFlag !== null)
    .map((t) => ({
      taskId: t.id,
      title: t.title,
      storyPoints: Number(t.storyPoints || 0),
      sprintFlag: t.sprintFlag!,
      completedAt: t.completedAt!,
    }))

  return {
    completedPoints,
    plannedPoints,
    overVelocity,
    flaggedTasks,
    taskCount: completedTasks.length,
  }
}
```

**Key decisions**:
- Velocity is always computed from raw task data — never cached
- `storyPoints || 0`: tasks without SP contribute 0
- `plannedPoints` only when sprintId provided (sprint-specific context)
- `flaggedTasks`: all completed tasks with non-null sprintFlag
- `overVelocity = completed/planned`. If planned=0, `overVelocity` is undefined (display "N/A")

**Implementation steps**:
1. Define types and input schema
2. Implement base query for completed tasks in date range
3. Add workspace filter (join through projects)
4. Add planned points computation for sprint views
5. Build flagged tasks list

**Feedback loop**:
- **Playground**: Write tests with seeded data
- **Experiment**: 2 tasks completed in range with SP=3,5 → completedPoints=8. Task with sprintFlag="unscheduled" → appears in flaggedTasks. Query with sprintId → planned excludes flagged
- **Check command**: `bun run --filter api test -- velocity`

### 2. Three View Modes

**Overview**: Three modes are different date windows fed to the same `computeVelocity` function.

```typescript
// shared/velocity/velocity.router.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { computeVelocity } from './velocity.service'
import { sprintService } from '../../modules/sprint/sprint.service'

export const velocityRouter = router({
  live: protectedProcedure
    .input(z.object({ sprintId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const sprint = await sprintService.getSprint(input.sprintId, ctx.user.id)
      return computeVelocity({
        startDate: new Date(sprint.startDate),
        endDate: new Date(), // now
        sprintId: sprint.id,
      })
    }),

  snapshot: protectedProcedure
    .input(z.object({ sprintId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const sprint = await sprintService.getSprint(input.sprintId, ctx.user.id)
      if (sprint.status !== 'completed') {
        throw new Error('Snapshot only available for completed sprints')
      }
      return computeVelocity({
        startDate: new Date(sprint.startDate),
        endDate: new Date(sprint.endDate),
        sprintId: sprint.id,
      })
    }),

  custom: protectedProcedure
    .input(
      z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
        workspaceIds: z.array(z.string().uuid()).optional(),
        projectIds: z.array(z.string().uuid()).optional(),
        userId: z.string().uuid().optional(),
      }),
    )
    .query(({ input }) => {
      if (new Date(input.startDate) > new Date(input.endDate)) {
        throw new Error('End date must be after start date')
      }
      return computeVelocity({
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        workspaceIds: input.workspaceIds,
        projectIds: input.projectIds,
        userId: input.userId,
      })
    }),
})
```

**Implementation steps**:
1. Live mode: sprint start → now, for active sprints
2. Snapshot mode: sprint start → sprint end, completed sprints only
3. Custom mode: user-selected dates, any combination of filters
4. All modes call `computeVelocity` — mode only determines the date window

### 3. VelocityView Component

**Overview**: Reusable component displaying velocity metrics and flagged tasks. Used on sprint, workspace, and global pages.

```svelte
<!-- VelocityView.svelte -->
<script lang="ts">
  import type { VelocityResult } from '$lib/types'

  export let data: VelocityResult
  export let title = 'Velocity'
  export let showPlanned = true

  $: overVelocityDisplay =
    data.overVelocity !== undefined
      ? `${(data.overVelocity * 100).toFixed(0)}%`
      : 'N/A'
</script>

<div class="velocity-view">
  <h2>{title}</h2>

  <div class="metrics">
    <div class="metric">
      <span class="label">Completed</span>
      <span class="value">{data.completedPoints}</span>
      <span class="unit">story points</span>
    </div>

    {#if showPlanned && data.plannedPoints !== undefined}
      <div class="metric">
        <span class="label">Planned</span>
        <span class="value">{data.plannedPoints}</span>
        <span class="unit">story points</span>
      </div>

      <div class="metric" class:over={data.overVelocity && data.overVelocity > 1}>
        <span class="label">Ratio</span>
        <span class="value">{overVelocityDisplay}</span>
      </div>
    {/if}

    <div class="metric">
      <span class="label">Tasks</span>
      <span class="value">{data.taskCount}</span>
    </div>
  </div>

  {#if data.flaggedTasks.length > 0}
    <div class="flagged-tasks">
      <h3>Flagged Tasks ({data.flaggedTasks.length})</h3>
      {#each data.flaggedTasks as task}
        <div class="flagged-task">
          <span class="flag-badge">{task.sprintFlag}</span>
          <span class="task-title">{task.title}</span>
          <span class="sp">{task.storyPoints} SP</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .velocity-view {
    padding: 1.5rem;
  }
  .metrics {
    display: flex;
    gap: 2rem;
    margin-top: 1rem;
  }
  .metric {
    text-align: center;
  }
  .metric .value {
    font-size: 2rem;
    font-weight: 700;
    display: block;
  }
  .metric .label {
    font-size: 0.75rem;
    text-transform: uppercase;
    color: var(--color-muted);
  }
  .metric .unit {
    font-size: 0.75rem;
    color: var(--color-muted);
  }
  .over .value {
    color: var(--color-success, #22c55e);
  }
  .flag-badge {
    background: var(--color-warning, #f59e0b);
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.75rem;
  }
</style>
```

**Implementation steps**:
1. Create `VelocityView` with metrics grid and flagged tasks list
2. Create `VelocityModeSelector`: three toggle buttons (Live / Snapshot / Custom)
3. Custom mode renders date pickers and filter dropdowns
4. Wire mode changes to API calls and re-render

**Feedback loop**:
- **Playground**: Dev server → Velocity page
- **Experiment**: Switch between Live/Snapshot/Custom modes → verify numbers change correctly
- **Check command**: `bun dev` (visual)

### 4. Global Velocity Page

```svelte
<!-- routes/(app)/velocity/+page.svelte -->
<script lang="ts">
  import { trpc } from '$lib/trpc'
  import VelocityView from '$lib/components/VelocityView.svelte'
  import VelocityModeSelector from '$lib/components/VelocityModeSelector.svelte'

  let mode = $state<'live' | 'snapshot' | 'custom'>('live')
  let velocityData = $state(null)
  let loading = $state(false)

  async function fetchLive(sprintId: string) {
    loading = true
    velocityData = await trpc.velocity.live.query({ sprintId })
    loading = false
  }

  async function fetchSnapshot(sprintId: string) {
    loading = true
    velocityData = await trpc.velocity.snapshot.query({ sprintId })
    loading = false
  }

  async function fetchCustom(params: { startDate: string; endDate: string; workspaceIds?: string[] }) {
    loading = true
    velocityData = await trpc.velocity.custom.query(params)
    loading = false
  }
</script>

<h1>Global Velocity</h1>

<VelocityModeSelector bind:mode {fetchLive} {fetchSnapshot} {fetchCustom} />

{#if loading}
  <p>Loading...</p>
{:else if velocityData}
  <VelocityView data={velocityData} title="All Workspaces" showPlanned={mode !== 'custom'} />
{/if}
```

### 5. Workspace Velocity Page

```svelte
<!-- routes/(app)/workspace/[id]/velocity/+page.svelte -->
<script lang="ts">
  // Same pattern as global velocity, but filters by workspaceId
  // Page load fetches workspace projects
  // VelocityView shows cross-project aggregation
</script>
```

**Implementation steps**:
1. Page load fetches workspace details and its projects via tRPC
2. User selects time range and optionally filters projects
3. Passes project IDs + date range to `velocity.custom`
4. Displays via VelocityView

### 6. Capacity Service & Router

**Overview**: Per-sprint per-employee capacity management with overload detection.

```typescript
// modules/sprint/capacity.router.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { capacityService } from './capacity.service'

export const capacityRouter = router({
  forSprint: protectedProcedure
    .input(z.object({ sprintId: z.string().uuid() }))
    .query(({ input, ctx }) => {
      return capacityService.getCapacityTable(input.sprintId, ctx.user.id)
    }),

  set: protectedProcedure
    .input(
      z.object({
        sprintId: z.string().uuid(),
        userId: z.string().uuid(),
        capacityHours: z.number().min(0),
        note: z.string().optional(),
      }),
    )
    .mutation(({ input, ctx }) => {
      return capacityService.setCapacity(input, ctx.user.id)
    }),
})
```

```typescript
// modules/sprint/capacity.service.ts
import { db } from '../../db/connection'
import { employeeCapacity, tasks, workspaceMembers } from '../../db/schema'
import { eq, and } from 'drizzle-orm'
import { sprintService } from './sprint.service'

interface MemberCapacity {
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
  const sprint = await sprintService.getSprint(sprintId, userId)

  // Get all workspace members for the sprint's project's workspace
  const members = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.workspaceId, sprint.project.workspaceId),
    with: { user: true },
  })

  // Get tasks assigned in this sprint
  const sprintTasks = await db.query.tasks.findMany({
    where: eq(tasks.sprintId, sprintId),
  })

  // Get capacity entries
  const capacities = await db.query.employeeCapacity.findMany({
    where: eq(employeeCapacity.sprintId, sprintId),
  })

  // Build capacity table rows
  return members.map((member) => {
    const userTasks = sprintTasks.filter((t) => t.assigneeId === member.userId)
    const estimatedHours = userTasks.reduce((sum, t) => sum + Number(t.estimatedHours || 0), 0)
    const capacity = capacities.find((c) => c.userId === member.userId)

    const isOverloaded = capacity ? estimatedHours > Number(capacity.capacityHours) : false
    const overloadPercent = capacity && Number(capacity.capacityHours) > 0
      ? Math.round((estimatedHours / Number(capacity.capacityHours)) * 100)
      : null

    return {
      userId: member.userId,
      user: { name: member.user.name, email: member.user.email },
      taskCount: userTasks.length,
      estimatedHours,
      capacityHours: capacity ? Number(capacity.capacityHours) : null,
      note: capacity?.note || null,
      isOverloaded,
      overloadPercent,
    }
  })
}

async function setCapacity(
  input: { sprintId: string; userId: string; capacityHours: number; note?: string },
  actorUserId: string,
) {
  const sprint = await sprintService.getSprint(input.sprintId, actorUserId)

  // Upsert capacity
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

  if (existing) {
    const [updated] = await db
      .update(employeeCapacity)
      .set({ capacityHours: String(input.capacityHours), note: input.note ?? null, updatedAt: new Date() })
      .where(eq(employeeCapacity.id, existing.id))
      .returning()
    return updated
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
    return created
  }
}

export const capacityService = { getCapacityTable, setCapacity }
```

**Key decisions**:
- Capacity is per sprint per employee
- Overload = `estimatedHours > capacityHours`
- Tasks without `estimatedHours` contribute 0
- No capacity set → status "Not set" (no warning)
- Capacity values are stored as decimal strings (DB column is decimal/numeric)

**Implementation steps**:
1. `forSprint`: returns all workspace members with task stats and capacity
2. `set`: upserts capacity for a user in a sprint
3. Frontend: CapacityTable loads data, renders editable rows
4. Sprint selector is shared between Board and Capacity tabs

### 7. CapacityTable Component

```svelte
<!-- CapacityTable.svelte -->
<script lang="ts">
  import { trpc } from '$lib/trpc'

  export let sprintId: string

  let members = $state<any[]>([])
  let loading = $state(true)

  $effect(() => {
    loadCapacity()
  })

  async function loadCapacity() {
    loading = true
    try {
      members = await trpc.capacity.forSprint.query({ sprintId })
    } finally {
      loading = false
    }
  }

  async function handleCapacityChange(userId: string, hours: number) {
    await trpc.capacity.set.mutate({ sprintId, userId, capacityHours: hours })
    await loadCapacity()
  }

  async function handleNoteChange(userId: string, note: string) {
    await trpc.capacity.set.mutate({ sprintId, userId, capacityHours: members.find(m => m.userId === userId)?.capacityHours ?? 0, note })
    await loadCapacity()
  }
</script>

<table class="capacity-table">
  <thead>
    <tr>
      <th>Employee</th>
      <th>Tasks</th>
      <th>Est. Hours</th>
      <th>Capacity</th>
      <th>Note</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    {#each members as m}
      <tr class:overloaded={m.isOverloaded}>
        <td>{m.user.name}</td>
        <td class="num">{m.taskCount}</td>
        <td class="num">{m.estimatedHours}h</td>
        <td>
          <input
            type="number"
            min="0"
            step="0.5"
            value={m.capacityHours ?? ''}
            onchange={(e) => handleCapacityChange(m.userId, Number(e.currentTarget.value))}
            placeholder="Set capacity"
          />
        </td>
        <td>
          <input
            type="text"
            value={m.note ?? ''}
            onchange={(e) => handleNoteChange(m.userId, e.currentTarget.value)}
            placeholder="e.g. vacation Mon-Tue"
          />
        </td>
        <td>
          {#if m.isOverloaded}
            ⚠️ {m.overloadPercent}%
          {:else if m.capacityHours !== null}
            ✅
          {:else}
            <span class="muted">Not set</span>
          {/if}
        </td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .capacity-table {
    width: 100%;
    border-collapse: collapse;
  }
  .capacity-table th {
    text-align: left;
    padding: 0.5rem;
    border-bottom: 2px solid var(--color-border);
    font-size: 0.75rem;
    text-transform: uppercase;
    color: var(--color-muted);
  }
  .capacity-table td {
    padding: 0.75rem 0.5rem;
    border-bottom: 1px solid var(--color-border-light);
  }
  .overloaded {
    background: rgba(239, 68, 68, 0.05);
  }
  .overloaded td:last-child {
    color: var(--color-danger, #ef4444);
    font-weight: 600;
  }
  .num {
    font-variant-numeric: tabular-nums;
  }
  .muted {
    color: var(--color-muted);
  }
  input {
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-size: 0.875rem;
  }
</style>
```

### 8. Sprint Board Tab Structure Update

```svelte
<!-- project/[id]/sprints/+page.svelte -->
<script lang="ts">
  import SprintBoard from '$lib/components/SprintBoard.svelte'
  import CapacityTable from '$lib/components/CapacityTable.svelte'

  let activeTab = $state<'board' | 'capacity'>('board')
  let selectedSprintId = $state(null)
</script>

<div class="tabs">
  <button class:active={activeTab === 'board'} onclick={() => (activeTab = 'board')}>Board</button>
  <button class:active={activeTab === 'capacity'} onclick={() => (activeTab = 'capacity')}>Capacity</button>
</div>

{#if activeTab === 'board'}
  <SprintBoard {sprints} {tasks} {onSprintChange} />
{:else}
  <CapacityTable sprintId={selectedSprintId} />
{/if}
```

## API Design

| Router | Procedure | Type | Description |
|---|---|---|---|
| `velocity` | `live` | query (protected) | Live velocity for active sprint (start → now) |
| `velocity` | `snapshot` | query (protected) | Frozen snapshot for completed sprint |
| `velocity` | `custom` | query (protected) | Custom date range with optional filters |
| `capacity` | `forSprint` | query (protected) | Capacity table for a sprint (all members + stats) |
| `capacity` | `set` | mutation (protected) | Set capacity hours and note for an employee |

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|---|---|
| `packages/api/src/shared/velocity/velocity.spec.ts` | Velocity computation: all three modes, edge cases |
| `packages/api/src/modules/sprint/capacity.service.spec.ts` | Capacity CRUD, overload detection |

**Key test cases**:
- Velocity: 3 tasks completed in range (SP=2,3,5) → completedPoints=10
- Velocity: Task with SP=null contributes 0
- Velocity: Task with sprintFlag appears in flaggedTasks
- Velocity: plannedPoints excludes flagged tasks
- Velocity: overVelocity = 1.25 when completed=10, planned=8
- Velocity: overVelocity = undefined when planned=0 (display "N/A")
- Velocity: Live mode = sprint.startDate → now
- Velocity: Snapshot only works on completed sprints
- Velocity: Custom with end < start → error
- Capacity: estimatedHours = sum of assigned tasks' hours
- Capacity: overloaded when assigned > capacity (120%)
- Capacity: no capacity → "Not set" (not an error)

### Manual Testing

- [ ] Active sprint shows live velocity updating
- [ ] Task from Sprint 3 completed during Sprint 2's window → counts toward Sprint 2
- [ ] Completed sprint snapshot is frozen
- [ ] Custom range shows correct points for that window
- [ ] Workspace velocity page aggregates across projects
- [ ] Global velocity page aggregates across workspaces
- [ ] Capacity table shows estimated hours per employee
- [ ] Set capacity → overload warning appears if exceeded
- [ ] Add note → appears inline with capacity
- [ ] Sprint selector syncs between Board and Capacity tabs

## Error Handling

| Error Scenario | Handling Strategy |
|---|---|
| Snapshot on active sprint | Throw `Error('Snapshot only available for completed sprints')` |
| Custom range end < start | Throw `Error('End date must be after start date')` |
| Capacity for non-member | Return `TRPCError({ code: 'BAD_REQUEST' })` |
| No completed tasks in range | Return `completedPoints=0` (not an error) |
| Sprint not found | Return `TRPCError({ code: 'NOT_FOUND' })` |

## Failure Modes

| Component | Failure Mode | Trigger | Impact | Mitigation |
|---|---|---|---|---|
| Velocity Engine | Timezone boundary | completedAt in UTC, range in local | Edge tasks counted wrong | Store and query in UTC; convert at display |
| Velocity Engine | Large range scan | Custom range spanning years | Query timeout | Accept for v1 (≤ 12 month range) |
| Capacity Table | Stale sprint selector | PM switches sprint on Board, Capacity reads old | Wrong capacity shown | Synchronize via shared url state |
| Capacity Table | Concurrent edits | Two PMs edit same row | Last-write-wins | Accept for v1 |
| VelocityView | Division by zero | plannedPoints=0 | "Infinity" display | Guard → display "N/A" |

## Validation Commands

```bash
bun run --filter '*' typecheck
bun run --filter api test -- velocity
bun run --filter api test -- capacity
bun dev
```

## Open Items

- [ ] Auto-calculate capacity from sprint duration × daily hours? (No — manual entry in v1)
- [ ] Velocity auto-refresh on task completion? (No — manual refresh/load in v1)
- [ ] Add velocity trend/line chart? (Future consideration)

---

_This spec is ready for implementation. Follow the patterns and validate at each step._
