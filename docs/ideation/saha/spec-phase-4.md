# Implementation Spec: Saha - Phase 4

**Contract**: ./contract.md
**PRD**: ./prd-phase-4.md
**Estimated Effort**: M

## Technical Approach

Phase 4 delivers the analytical engine that makes Saha a real PM tool. The velocity computation engine is a shared service that accepts a date range and optional filters, then computes completed points based on `completedAt` timestamps rather than sprint ownership. This same formula powers three view modes: Live (sprint start → now), Snapshot (sprint start → sprint end for completed sprints), and Custom Range (any start/end).

Two velocity pages are built: workspace-level (aggregated across projects within a workspace) and global (aggregated across all workspaces). Both reuse a shared `VelocityView` Svelte component parameterized by a workspace ID filter.

The Capacity sub-tab lives inside the Sprint Board. It reads all workspace members, sums their estimated hours for tasks in the selected sprint, compares against per-sprint capacity hours stored in `employee_capacity`, and flags overloads. The PM sets capacity via editable number inputs with optional notes.

No new database tables are needed — capacity data goes into `employee_capacity` (defined in Phase 1), and velocity is computed purely from task and sprint data.

## Feedback Strategy

**Inner-loop command**: `bun run --filter api test`

**Playground**: Test suite for velocity computation (deterministic math). Dev server for velocity pages and capacity table interaction.

**Why this approach**: Velocity and capacity calculations are pure logic — tests provide the fastest, most reliable feedback loop.

## File Changes

### New Files

| File Path | Purpose |
|---|---|
| `packages/api/src/shared/velocity/velocity.service.ts` | Velocity engine: compute completed/planned/over-velocity for date range |
| `packages/api/src/shared/velocity/velocity.spec.ts` | Velocity engine unit tests |
| `packages/api/src/modules/sprint/sprint.route.ts` (add velocity endpoint) | Sprint velocity endpoint |
| `packages/api/src/modules/sprint/capacity.route.ts` | Capacity endpoints: get/set capacity per sprint per employee |
| `packages/api/src/modules/sprint/capacity.service.ts` | Capacity logic: overload detection |
| `packages/web/src/lib/components/VelocityView.svelte` | Reusable velocity display component (numeric summary + flagged tasks) |
| `packages/web/src/lib/components/VelocityModeSelector.svelte` | Mode switcher: Live / Snapshot / Custom Range |
| `packages/web/src/lib/components/CapacityTable.svelte` | Per-sprint employee capacity grid |
| `packages/web/src/routes/(app)/velocity/+page.svelte` | Global velocity page (cross-workspace) |
| `packages/web/src/routes/(app)/workspace/[id]/velocity/+page.svelte` | Workspace velocity page (cross-project) |
| `packages/web/src/routes/(app)/project/[id]/sprints/capacity/+page.svelte` | Capacity sub-tab page |

### Modified Files

| File Path | Changes |
|---|---|
| `packages/api/src/index.ts` | Mount velocity routes (or use sprint module's velocity sub-route) |
| `packages/web/src/routes/(app)/project/[id]/sprints/+page.svelte` | Add Capacity sub-tab alongside Board tab |
| `packages/web/src/routes/(app)/project/[id]/sprints/+layout.svelte` (if exists) or `+page.svelte` | Add tab navigation: Board | Capacity |
| `packages/web/src/routes/(app)/+layout.svelte` | Wire Velocity sidebar link to global velocity page |
| `packages/web/src/routes/(app)/workspace/[id]/+layout.svelte` | Add Velocity nav item in workspace layout |

## Implementation Details

### 1. Velocity Engine

**Overview**: Pure computation service. Given a date range and optional filters, returns completed points, planned points, over-velocity ratio, and list of flagged tasks.

```typescript
// shared/velocity/velocity.service.ts
interface VelocityInput {
  startDate: Date;
  endDate: Date;
  workspaceIds?: string[];   // filter by workspaces
  projectIds?: string[];     // filter by projects
  sprintId?: string;         // for snapshot mode (filters to sprint + date range)
  userId?: string;           // for employee velocity
}

interface VelocityResult {
  completedPoints: number;
  plannedPoints?: number;     // only when sprintId is provided
  overVelocity?: number;      // completed/planned, only when sprintId provided
  flaggedTasks: Array<{
    taskId: string;
    title: string;
    storyPoints: number;
    sprintFlag: string;
    completedAt: Date;
  }>;
  taskCount: number;
}

async function computeVelocity(input: VelocityInput): Promise<VelocityResult> {
  // Build base query: tasks WHERE completedAt BETWEEN startDate AND endDate
  // AND status = 'done'

  let query = db.select({
    id: tasks.id,
    title: tasks.title,
    storyPoints: tasks.storyPoints,
    sprintFlag: tasks.sprintFlag,
    sprintId: tasks.sprintId,
    completedAt: tasks.completedAt,
    projectId: tasks.projectId,
  }).from(tasks)
    .where(and(
      gte(tasks.completedAt, input.startDate),
      lte(tasks.completedAt, input.endDate),
      eq(tasks.status, 'done'),
    ));

  // Apply optional filters
  if (input.projectIds?.length) {
    query = query.where(inArray(tasks.projectId, input.projectIds));
  }
  if (input.workspaceIds?.length) {
    // Need to join through projects → workspaces
    query = query.innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(inArray(projects.workspaceId, input.workspaceIds));
  }
  if (input.userId) {
    query = query.where(eq(tasks.assigneeId, input.userId));
  }

  const completedTasks = await query;

  const completedPoints = completedTasks.reduce(
    (sum, t) => sum + (t.storyPoints || 0), 0
  );

  // If sprintId provided, compute planned points and over-velocity
  let plannedPoints: number | undefined;
  let overVelocity: number | undefined;

  if (input.sprintId) {
    const plannedTasks = await db.select({ storyPoints: tasks.storyPoints })
      .from(tasks)
      .where(and(
        eq(tasks.sprintId, input.sprintId),
        isNull(tasks.sprintFlag),  // planned tasks have no flag
      ));

    plannedPoints = plannedTasks.reduce(
      (sum, t) => sum + (t.storyPoints || 0), 0
    );
    overVelocity = plannedPoints > 0 ? completedPoints / plannedPoints : undefined;
  }

  // Extract flagged tasks
  const flaggedTasks = completedTasks
    .filter(t => t.sprintFlag !== null)
    .map(t => ({
      taskId: t.id,
      title: t.title,
      storyPoints: t.storyPoints || 0,
      sprintFlag: t.sprintFlag!,
      completedAt: t.completedAt!,
    }));

  return {
    completedPoints,
    plannedPoints,
    overVelocity,
    flaggedTasks,
    taskCount: completedTasks.length,
  };
}
```

**Key decisions**:
- Velocity is always computed from raw task data — never cached as a pre-computed value
- `storyPoints || 0`: tasks without story points contribute 0 to velocity
- `plannedPoints` only computed when `sprintId` is provided (snapshot context)
- `flaggedTasks` includes all completed tasks with non-null sprintFlag, regardless of which sprint owns them

**Implementation steps**:
1. Define `VelocityInput` and `VelocityResult` types
2. Implement base query for completed tasks in date range
3. Add support for workspace, project, user filters
4. Add planned points computation for sprint-specific views
5. Build flagged tasks list
6. Handle edge case: `completedPoints = 0` and `plannedPoints = 0` → overVelocity = null (display "N/A")

**Feedback loop**:
- **Playground**: Write `velocity.spec.ts` with fixed test data
- **Experiment**: Seed DB with tasks: 2 completed in range with SP=3 and SP=5 → completedPoints=8. 1 task with sprintFlag="unscheduled" → appears in flaggedTasks. Query with sprintId → plannedPoints excludes flagged tasks
- **Check command**: `bun run --filter api test -- velocity`

### 2. Three View Modes

**Overview**: Three modes map directly to different date windows fed to the same `computeVelocity` function.

```typescript
// Live mode
async function getLiveVelocity(sprintId: string) {
  const sprint = await getSprint(sprintId);
  return computeVelocity({
    startDate: sprint.startDate,
    endDate: new Date(), // now
    sprintId: sprint.id,
  });
}

// Snapshot mode
async function getSnapshotVelocity(sprintId: string) {
  const sprint = await getSprint(sprintId);
  if (sprint.status !== 'completed') {
    throw new Error('Snapshot only available for completed sprints');
  }
  return computeVelocity({
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    sprintId: sprint.id,
  });
}

// Custom range mode
async function getCustomVelocity(startDate: Date, endDate: Date, filters?: VelocityFilters) {
  return computeVelocity({ startDate, endDate, ...filters });
}
```

**Implementation steps**:
1. Live mode: sprint start → now, tied to an active sprint
2. Snapshot mode: sprint start → sprint end, only for completed (locked) sprints
3. Custom range: user-selected dates, any filters
4. All three call the same `computeVelocity` function — the mode only determines the date window

### 3. Velocity Endpoint

```typescript
// sprint.route.ts (velocity routes)
const velocityRoutes = new Elysia({ prefix: '/velocity' })
  .get('/live/:sprintId', ({ params }) => getLiveVelocity(params.sprintId))
  .get('/snapshot/:sprintId', ({ params }) => getSnapshotVelocity(params.sprintId))
  .get('/custom', ({ query }) => getCustomVelocity(
    new Date(query.startDate),
    new Date(query.endDate),
    {
      workspaceIds: query.workspaceIds?.split(','),
      projectIds: query.projectIds?.split(','),
      userId: query.userId,
    }
  ))
```

### 4. VelocityView Component (Svelte)

**Overview**: Reusable component that displays velocity data. Used on sprint, workspace, and global pages.

```svelte
<!-- VelocityView.svelte -->
<script lang="ts">
  export let data: VelocityResult;
  export let title: string;
  export let showPlanned = true;
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
        <span class="value">
          {data.overVelocity !== undefined
            ? `${(data.overVelocity * 100).toFixed(0)}%`
            : 'N/A'}
        </span>
      </div>
    {/if}
  </div>

  {#if data.flaggedTasks.length > 0}
    <div class="flagged-tasks">
      <h3>Flagged Tasks ({data.flaggedTasks.length})</h3>
      {#each data.flaggedTasks as task}
        <div class="flagged-task">
          <span>{task.title}</span>
          <span class="flag">{task.sprintFlag}</span>
          <span>{task.storyPoints} SP</span>
        </div>
      {/each}
    </div>
  {/if}
</div>
```

**Implementation steps**:
1. Create VelocityView with metrics display and flagged tasks section
2. Create VelocityModeSelector: three buttons (Live, Snapshot, Custom)
3. Custom mode shows date picker inputs
4. Wire view mode changes to API calls

### 5. Workspace Velocity Page

**Overview**: Shows velocity aggregated across all projects in a workspace.

```typescript
// workspace/[id]/velocity/+page.svelte
export async function load({ params }) {
  const workspace = await api.workspaces({ id: params.id }).get();
  const projects = await api.projects.get({ query: { workspaceId: params.id } });
  return { workspace: workspace.data, projects: projects.data };
}
```

**Implementation steps**:
1. Page load fetches workspace details and its projects
2. User selects time range (mode selector)
3. Passes workspace's project IDs + date range to velocity endpoint
4. Displays result via VelocityView component

### 6. Global Velocity Page

**Overview**: Aggregates velocity across all workspaces.

```typescript
// velocity/+page.svelte
export async function load() {
  const workspaces = await api.workspaces.get();
  return { workspaces: workspaces.data };
}
```

**Implementation steps**:
1. Page load fetches all workspaces
2. User selects time range and optionally filters by workspace
3. Passes selected workspace IDs + date range to velocity endpoint
4. Displays result via VelocityView component

### 7. Capacity Table

**Overview**: Grid within Sprint Board showing per-employee capacity vs. assigned work for the selected sprint.

```svelte
<!-- CapacityTable.svelte -->
<script lang="ts">
  export let sprintId: string;
  let members: MemberCapacity[] = [];
  let loading = true;

  async function loadCapacity() {
    const res = await api.sprints({ id: sprintId }).capacity.get();
    members = res.data;
    loading = false;
  }

  async function updateCapacity(userId: string, hours: number, note?: string) {
    await api.sprints({ id: sprintId }).capacity.post({
      userId,
      capacityHours: hours,
      note,
    });
    await loadCapacity();
  }
</script>

<table>
  <thead>
    <tr>
      <th>Employee</th>
      <th>Tasks</th>
      <th>Est. Hours</th>
      <th>Capacity</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    {#each members as m}
      <tr>
        <td>{m.user.name}</td>
        <td>{m.taskCount}</td>
        <td>{m.estimatedHours}h</td>
        <td>
          <input type="number" value={m.capacityHours || ''}
            on:change={(e) => updateCapacity(m.userId, Number(e.target.value), m.note)} />
          {#if m.note}
            <span class="note">{m.note}</span>
          {/if}
        </td>
        <td class:overloaded={m.isOverloaded}>
          {m.isOverloaded ? `⚠️ ${m.overloadPercent}%` : m.capacityHours ? '✅' : 'Not set'}
        </td>
      </tr>
    {/each}
  </tbody>
</table>
```

**Key decisions**:
- Capacity is per sprint per employee, stored in `employee_capacity` table
- Overload = `estimatedHours > capacityHours`
- If a task has no estimatedHours, it contributes 0 to the sum
- If no capacity is set for an employee, status shows "Not set" (no warning)

**Implementation steps**:
1. Backend: `GET /sprints/:id/capacity` — returns all workspace members with their task stats and capacity for that sprint
2. Backend: `POST /sprints/:id/capacity` — upserts capacity for a user in a sprint
3. Frontend: CapacityTable component loads data, renders editable rows
4. Sprint selector dropdown is shared between Board and Capacity tabs (synchronized state)

**Feedback loop**:
- **Playground**: Dev server → Project → Sprints → Capacity tab
- **Experiment**: Set capacity for user to 40h, create tasks totaling 48h estimated → overload warning appears. Update capacity to 50h → warning disappears. Add note "vacation Mon" → note appears
- **Check command**: `bun dev` (visual verification)

### 8. Capacity Sub-Tab Structure

**Overview**: Sprint Board page gets sub-tab navigation.

```svelte
<!-- project/[id]/sprints/+page.svelte -->
<script lang="ts">
  let activeTab: 'board' | 'capacity' = 'board';
</script>

<div class="tabs">
  <button class:active={activeTab === 'board'} on:click={() => activeTab = 'board'}>Board</button>
  <button class:active={activeTab === 'capacity'} on:click={() => activeTab = 'capacity'}>Capacity</button>
</div>

{#if activeTab === 'board'}
  <SprintBoard {sprints} {tasks} {onSprintChange} />
{:else}
  <CapacityTable sprintId={selectedSprintId} />
{/if}
```

## API Design

| Method | Path | Description |
|---|---|---|
| `GET` | `/velocity/live/:sprintId` | Live velocity for active sprint |
| `GET` | `/velocity/snapshot/:sprintId` | Snapshot velocity for completed sprint |
| `GET` | `/velocity/custom` | Custom range velocity (?startDate, ?endDate, ?workspaceIds, ?projectIds, ?userId) |
| `GET` | `/sprints/:id/capacity` | Get capacity table for a sprint |
| `POST` | `/sprints/:id/capacity` | Set capacity for an employee in a sprint (body: userId, capacityHours, note?) |

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|---|---|
| `packages/api/src/shared/velocity/velocity.spec.ts` | Velocity computation across all three modes |
| `packages/api/src/modules/sprint/capacity.service.spec.ts` | Capacity CRUD, overload detection |

**Key test cases**:
- Velocity: 3 tasks completed in range with SP=2,3,5 → completedPoints=10
- Velocity: Task with SP=null contributes 0
- Velocity: Task with sprintFlag="unscheduled" appears in flaggedTasks
- Velocity: plannedPoints excludes tasks with non-null sprintFlag
- Velocity: overVelocity = 1.25 when completed=10 and planned=8
- Velocity: overVelocity = null when planned=0
- Velocity: Live mode uses sprint.startDate → now
- Velocity: Snapshot mode uses sprint.startDate → sprint.endDate (locked sprint only)
- Velocity: Custom mode uses user-provided dates
- Capacity: estimatedHours = sum of assigned tasks' estimatedHours
- Capacity: overloaded when assigned > capacity
- Capacity: task with no estimatedHours contributes 0
- Capacity: no capacity set → "Not set" status (no warning)

## Error Handling

| Error Scenario | Handling Strategy |
|---|---|
| Snapshot requested for active sprint | Return 400 "Snapshot only available for completed sprints" |
| Custom range with end < start | Return 400 "End date must be after start date" |
| Capacity update for non-workspace-member | Return 400 "User is not a member of this workspace" |
| Velocity query with no completed tasks in range | Return completedPoints=0, empty flaggedTasks (not an error) |
| Sprint not found for velocity query | Return 404 |

## Failure Modes

| Component | Failure Mode | Trigger | Impact | Mitigation |
|---|---|---|---|---|
| Velocity Engine | Timezone boundary issues | `completedAt` stored in UTC, date range in local time | Tasks completed at 11pm PT on Sunday counted in wrong sprint | Store and query all dates in UTC; application layer converts to user's timezone |
| Velocity Engine | Large date range scan | Custom range spanning years with 10k+ completed tasks | Query timeout or slow response | Add pagination or limit; v1: accept for reasonable ranges (≤ 12 months) |
| Capacity Table | Stale sprint selector | PM switches sprint on Board tab, Capacity tab uses old sprintId | Capacity shown for wrong sprint | Synchronize via shared store or URL param (both tabs read same sprintId) |
| Capacity Table | Concurrent capacity edits | Two PMs edit same employee's capacity simultaneously | Last-write-wins, one edit lost | Accept for v1; future: optimistic locking with version field |
| VelocityView | Division by zero display | plannedPoints = 0 → overVelocity would be Infinity | UI shows "Infinity" or crashes | Guard: if plannedPoints === 0, display "N/A" for over-velocity |

## Validation Commands

```bash
# Type checking
bun run --filter '*' typecheck

# API tests (velocity engine)
bun run --filter api test -- velocity

# API tests (capacity)
bun run --filter api test -- capacity

# Dev server
bun dev
```

## Open Items

- [ ] Should capacity be auto-calculated from sprint duration × daily hours? (No for v1 — per-sprint manual entry. Future enhancement)
- [ ] Should velocity pages auto-refresh on task completion? (No — manual refresh or page navigation triggers new computation)

---

_This spec is ready for implementation. Follow the patterns and validate at each step._
