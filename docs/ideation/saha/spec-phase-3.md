# Implementation Spec: Saha - Phase 3

**Contract**: ./contract.md
**PRD**: ./prd-phase-3.md
**Estimated Effort**: M

## Technical Approach

Phase 3 adds the sprint layer on top of the existing task and project infrastructure. The Sprint module provides CRUD operations with flexible date ranges. The Sprint Board is a horizontal Kanban-like layout where each sprint is a column, plus a "Backlog" column for unassigned tasks. Drag-and-drop between sprint columns reuses the same pointer-event pattern from the Kanban board, adapted for horizontal movement.

Sprint flags are handled as a nullable text field on the task model. When a task is created or moved into an active sprint, the user can set a flag string. The null state means "planned" — the task was part of the original sprint plan. Sprint locking is enforced via a status check before any write operation to a sprint. When a sprint's end date passes, its status auto-transitions to "completed" and it becomes read-only for task assignments.

This phase has zero new database tables — it uses the existing `sprints` table and the `sprintId`/`sprintFlag` columns on `tasks` from Phase 1.

## Feedback Strategy

**Inner-loop command**: `bun run --filter api test`

**Playground**: Test suite for sprint logic (auto-status, locking, flag logic). Dev server for Sprint Board interaction (drag between columns, horizontal scroll).

**Why this approach**: Sprint logic is deterministic (status transitions, locking rules). The Sprint Board is an interaction-heavy UI component best validated visually.

## File Changes

### New Files

| File Path | Purpose |
|---|---|
| `packages/api/src/modules/sprint/sprint.route.ts` | Sprint endpoints: CRUD, list by project |
| `packages/api/src/modules/sprint/sprint.service.ts` | Sprint logic: auto-status, locking, planned points snapshot |
| `packages/api/src/modules/sprint/sprint.schema.ts` | Elysia validation schemas |
| `packages/api/src/modules/sprint/sprint.type.ts` | Sprint types |
| `packages/web/src/lib/components/SprintBoard.svelte` | Horizontal sprint columns + Backlog, drag-and-drop |
| `packages/web/src/lib/components/SprintColumn.svelte` | Single sprint column: header + task list |
| `packages/web/src/lib/components/SprintTaskCard.svelte` | Task card for sprint columns (title, assignee, due date, priority, status badge) |
| `packages/web/src/routes/(app)/project/[id]/sprints/+page.svelte` | Sprint Board page (Board tab) |

### Modified Files

| File Path | Changes |
|---|---|
| `packages/api/src/index.ts` | Mount sprint route module |
| `packages/web/src/routes/(app)/project/[id]/+layout.svelte` | Make Sprints tab functional (route to /sprints) |
| `packages/api/src/modules/task/task.service.ts` | Add sprint flag handling on task creation/move; enforce sprint lock check on assignment |
| `packages/api/src/modules/task/task.route.ts` | Add sprintFlag to task create/update schemas |

### Deleted Files

None.

## Implementation Details

### 1. Sprint Module (Elysia)

**Overview**: CRUD for sprints with automatic status management and locking.

```typescript
// sprint.route.ts
const sprintRoutes = new Elysia({ prefix: '/sprints' })
  .get('/', ({ query }) => listByProject(query.projectId))
  .post('/', ({ body, user }) => createSprint(body, user.id))
  .get('/:id', ({ params }) => getSprint(params.id))
  .patch('/:id', ({ params, body, user }) => updateSprint(params.id, body, user.id))
  .delete('/:id', ({ params }) => deleteSprint(params.id))
```

**Key decisions**:
- Sprint status is determined by comparing current date with start/end dates, not stored as a mutable field (though we store it for query efficiency)
- When a sprint is created with start date in the past, status is set to "active" immediately
- Sprint locking is enforced on the write path: any task assignment to a completed sprint returns 400

**Implementation steps**:
1. Create sprint: validate startDate < endDate, set initial status based on dates
2. Read sprint: if status would have changed based on current date, update it on read (lazy transition)
3. Update sprint: only allowed fields are name, startDate, endDate, goal
4. Delete sprint: tasks in the sprint have sprintId set to null (not cascade deleted)
5. Sprint list: return all sprints for a project, ordered by startDate ASC

**Feedback loop**:
- **Playground**: Test via API tests
- **Experiment**: Create sprint with past dates → status = "active". Create sprint with future dates → status = "planned". Create sprint where now is between dates → status = "active"
- **Check command**: `bun run --filter api test -- sprint`

### 2. Sprint Status Auto-Transition

**Overview**: When a sprint's end date passes, its status becomes "completed" and it locks. This is computed lazily (on any read of the sprint) and eagerly (a scheduled check).

```typescript
// sprint.service.ts
function getSprintStatus(sprint: Sprint): 'planned' | 'active' | 'completed' {
  const now = new Date();
  if (now > sprint.endDate) return 'completed';
  if (now >= sprint.startDate) return 'active';
  return 'planned';
}

function isSprintLocked(sprint: Sprint): boolean {
  return getSprintStatus(sprint) === 'completed';
}
```

**Implementation steps**:
1. Implement `getSprintStatus` — pure function based on current date
2. On every sprint read, check if status needs updating; if so, update the row
3. If transitioning to "completed", compute plannedPoints snapshot (sum of tasks with sprintFlag=null)
4. Lock prevents: adding tasks to the sprint, moving tasks into the sprint

### 3. Sprint Flag Handling

**Overview**: When a task is assigned to an active sprint, the sprint flag can be set. Null = planned, any string = unplanned with context.

```typescript
// In task.service.ts — createTask or updateTask
if (sprintId && sprintFlag !== undefined) {
  const sprint = await getSprint(sprintId);
  if (isSprintLocked(sprint)) {
    throw new Error('Cannot assign tasks to a completed sprint');
  }
  // If sprint is active and no flag provided, default to null (planned)
  // If sprint is active and flag provided, store it
}
```

**Implementation steps**:
1. Add sprintFlag to task create and update endpoints
2. Validate: sprintFlag can be any string or null
3. Before assigning task to sprint, check sprint is not locked
4. When task is created directly into an active sprint without explicit flag, set to null (planned)
5. When PM explicitly sets a flag, store whatever string they provide

**Feedback loop**:
- **Playground**: Test via task creation with sprintFlag
- **Experiment**: Create task in active sprint without flag → sprintFlag=null. Create task with sprintFlag="unscheduled" → stored. Attempt to assign task to completed sprint → 400 error
- **Check command**: `bun run --filter api test -- task`

### 4. Sprint Board (Svelte)

**Overview**: Horizontal board where each sprint is a column. Drag tasks between sprint columns.

```svelte
<!-- SprintBoard.svelte -->
<script lang="ts">
  export let sprints: Sprint[];
  export let tasks: Task[];
  export let onSprintChange: (taskId: string, newSprintId: string | null) => void;

  $: backlogTasks = tasks.filter(t => !t.sprintId);
  $: tasksBySprint = sprints.reduce((acc, sprint) => {
    acc[sprint.id] = tasks.filter(t => t.sprintId === sprint.id);
    return acc;
  }, {});
</script>

<div class="sprint-board" style="display: flex; overflow-x: auto; gap: 1rem;">
  {#each sprints as sprint}
    <SprintColumn
      {sprint}
      tasks={tasksBySprint[sprint.id] || []}
      onDrop={(taskId) => onSprintChange(taskId, sprint.id)}
      isLocked={sprint.status === 'completed'}
    />
  {/each}
  <SprintColumn
    sprint={{ name: 'Backlog', status: 'backlog' }}
    tasks={backlogTasks}
    onDrop={(taskId) => onSprintChange(taskId, null)}
    isLocked={false}
  />
</div>
```

**Key decisions**:
- Sprint Board uses CSS `overflow-x: auto` for horizontal scrolling (no custom scrollbar)
- The Backlog is a synthetic column (not a sprint row in DB) — tasks dropped there get sprintId = null
- Completed sprint columns are visually dimmed and refuse drops
- Task status is preserved when moving between sprints (drag changes sprintId only, not status)

**Implementation steps**:
1. Create SprintBoard container with horizontal flex layout
2. Create SprintColumn: renders sprint header (name, date range, task count) + draggable task list
3. Create SprintTaskCard: compact card showing title, assignee, due date, priority badge, status badge
4. Implement drag-and-drop using pointer events (same pattern as Kanban from Phase 2)
5. On drop: call API PATCH /tasks/:id with new sprintId
6. Handle Backlog column: dropping there sets sprintId to null

**Feedback loop**:
- **Playground**: Dev server → Project → Sprints tab
- **Experiment**: Create 2 sprints, assign tasks. Drag task from Sprint 1 to Sprint 2 → verify task moves. Drag task to Backlog → verify sprintId cleared. Attempt drag to completed sprint → verify rejected
- **Check command**: `bun dev` (visual verification)

### 5. Project Sprints Page

**Overview**: The Sprints tab on the project page renders the Sprint Board with data fetched from the API.

```typescript
// +page.svelte (load function)
export async function load({ params, fetch }) {
  const sprints = await api.sprints.get({ query: { projectId: params.id } });
  const tasks = await api.tasks.get({ query: { projectId: params.id } });
  return { sprints: sprints.data, tasks: tasks.data };
}
```

**Implementation steps**:
1. Page load fetches sprints and tasks for the project
2. Passes data to SprintBoard component
3. Handles sprint change events → calls API
4. Optional: add "New Sprint" button → opens sprint creation modal/form

## API Design

| Method | Path | Description |
|---|---|---|
| `GET` | `/sprints` | List sprints for a project (?projectId=) |
| `POST` | `/sprints` | Create sprint (name, startDate, endDate) |
| `GET` | `/sprints/:id` | Get sprint detail (triggers lazy status check) |
| `PATCH` | `/sprints/:id` | Update sprint (name, dates, goal only) |
| `DELETE` | `/sprints/:id` | Delete sprint (tasks unassigned, not deleted) |

### Task endpoint additions

The existing `POST /tasks` and `PATCH /tasks/:id` endpoints accept `sprintFlag` (string | null) and enforce sprint locking on `sprintId` assignment.

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|---|---|
| `packages/api/src/modules/sprint/sprint.service.spec.ts` | Status computation, locking, planned points snapshot |

**Key test cases**:
- Sprint with endDate in past → status = "completed", locked = true
- Sprint with startDate in future → status = "planned", locked = false
- Sprint with now between dates → status = "active", locked = false
- Task assignment to locked sprint → throws error
- Planned points sum excludes tasks with non-null sprintFlag
- Sprint delete clears sprintId on associated tasks

### Manual Testing

- [ ] Create sprint "Sprint 1" with dates May 1–14 → appears as column
- [ ] Create sprint "Sprint 2" with dates May 15–28 → appears as second column
- [ ] Backlog column shows tasks without sprint assigned
- [ ] Drag a task from Backlog into Sprint 1 → task appears in Sprint 1 column
- [ ] Verify task now has sprintId = Sprint 1's ID
- [ ] Drag a task from Sprint 1 to Sprint 2 → task moves columns
- [ ] Verify task's status is unchanged after moving between sprints
- [ ] Set task's sprintFlag to "unscheduled" → flag visible on card
- [ ] Sprint Board is horizontally scrollable with 3+ sprints
- [ ] Completed sprint column is visually dimmed
- [ ] Cannot drag task into completed sprint column

## Error Handling

| Error Scenario | Handling Strategy |
|---|---|
| Sprint creation with startDate > endDate | Return 400 "Start date must be before end date" |
| Task assignment to completed sprint | Return 400 "Cannot assign tasks to a completed sprint" |
| Sprint update after completion | Return 400 "Cannot modify a completed sprint" |
| Sprint delete with active tasks | Warn: "X tasks will be unassigned", proceed on confirm |
| Drag to completed sprint column | Drop rejected, card snaps back (no API call) |

## Failure Modes

| Component | Failure Mode | Trigger | Impact | Mitigation |
|---|---|---|---|---|
| Sprint Status | Stale status in DB | Sprint end date passes but status not updated (no reads occur) | Sprint appears active when it should be completed | Update status eagerly on any sprint read; also run a lightweight cron/middleware check |
| Sprint Lock | Race condition | Two users assign tasks to sprint simultaneously as it locks | One task assigned after lock (stale read) | Check lock at write time with SELECT FOR UPDATE or application-level lock |
| Sprint Flag | Flag loss on task move | User drags task to new sprint, flag is cleared without intent | Context lost for why task was added | Preserve sprintFlag when status of task is unchanged; only clear if explicitly set to null |
| Sprint Board | Overscroll on many sprints | 10+ sprints, horizontal scroll becomes unwieldy | Poor UX for long-lived projects | Accept for v1; future: collapse completed sprints, add sprint filter/search |

## Validation Commands

```bash
# Type checking
bun run --filter '*' typecheck

# API tests
bun run --filter api test -- sprint

# Dev server (Sprint Board visual check)
bun dev
```

## Open Items

- [ ] Should sprint creation auto-compute plannedPoints at create time? (No — computed at lock time to allow editing before sprint starts)
- [ ] Should completed sprints be collapsed by default? (No — v1 shows all. Future enhancement)

---

_This spec is ready for implementation. Follow the patterns and validate at each step._
