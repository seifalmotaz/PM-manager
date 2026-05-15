# Saha — Level 2: Task & Sprint Flow

**Version:** 1.0  
**Date:** May 15, 2026  
**Status:** Approved  
**Theme:** Sprint creation/completion, task auto-capture, sprint flags. PM workflows complete.

---

## Objective

Complete the PM workflow cycle. Sprint creation becomes discoverable. Sprint completion locks everything and creates velocity snapshots. Task auto-capture replaces manual time tracking. Sprint flags become manageable. The simplified status model (`todo → in_progress → done`) is enforced.

---

## Status Model

### Simplified Status Flow

```
todo ←→ in_progress ←→ done
```

**Removed:** `review` status (deferred to future level)

**Rules:**
- Adjacent transitions only (no jumps)
- `todo → done` blocked
- `done → todo` blocked (must go through `in_progress`)
- Drag-and-drop validates transitions; invalid drops show error toast

**Database Impact:**

```sql
-- tasks.status values: 'todo', 'in_progress', 'done'
-- No 'review' value allowed
```

**Frontend Impact:**

- Kanban columns: 3 instead of 4
- Status dropdown: 3 options instead of 4
- All existing `review` tasks migrated to `in_progress` during L2 migration

---

## Sprint Creation

### UI: "New Sprint" Button

**Location:** Sprint board header, next to sprint selector dropdown

**Behavior:**
- Visible at all times on sprint board page
- Click → opens `SprintCreateModal`
- Modal fields: name, goal (optional), start date, end date
- Default end date = start date + `defaultSprintLengthDays` from `organization_settings`
- Validation: start date < end date
- On create: sprint appears in selector, auto-selected

**Component:**

```svelte
<!-- /packages/web/src/routes/[orgSlug]/project/[id]/sprints/+page.svelte -->
<script lang="ts">
  import SprintCreateModal from '$lib/components/SprintCreateModal.svelte'
  import SprintBoard from '$lib/components/SprintBoard.svelte'
  
  let showCreateModal = $state(false)
  let sprints = $state<Sprint[]>([])
  let selectedSprintId = $state<string | null>(null)
  
  async function createSprint(data: SprintCreateData) {
    const sprint = await trpc.sprint.create.mutate({
      projectId: data.projectId,
      name: data.name,
      goal: data.goal,
      startDate: data.startDate,
      endDate: data.endDate,
    })
    sprints.push(sprint)
    selectedSprintId = sprint.id
    showCreateModal = false
  }
</script>

<div class="sprint-board-page">
  <header>
    <h1>Sprints</h1>
    <select bind:value={selectedSprintId}>
      {#each sprints as sprint}
        <option value={sprint.id}>{sprint.name}</option>
      {/each}
    </select>
    <button class="new-sprint-btn" on:click={() => showCreateModal = true}>
      + New Sprint
    </button>
  </header>
  
  <SprintBoard sprintId={selectedSprintId} />
  
  {#if showCreateModal}
    <SprintCreateModal
      on:close={() => showCreateModal = false}
      on:create={createSprint}
    />
  {/if}
</div>
```

---

## Sprint Completion

### UI: "Complete Sprint" Button

**Location:** Sprint board header, next to sprint name (only visible for active sprints)

**Behavior:**
- Click → opens confirmation dialog
- Dialog shows:
  - Sprint name and dates
  - Number of completed tasks
  - Number of unfinished tasks
  - Binary choice: "Move all unfinished to backlog" OR "Move all unfinished to next sprint"
- On confirm:
  1. Sprint status → `completed`
  2. Sprint locked (no new tasks, no status changes)
  3. All overlapping `org_sessions` frozen (immutable)
  4. Velocity snapshot computed
  5. Unfinished tasks moved per user choice

**Component:**

```svelte
<!-- /packages/web/src/lib/components/SprintCompleteDialog.svelte -->
<script lang="ts">
  export let sprint: Sprint
  export let completedTasks: Task[]
  export let unfinishedTasks: Task[]
  
  let destination = $state<'backlog' | 'next-sprint'>('backlog')
  
  async function complete() {
    await trpc.sprint.complete.mutate({
      sprintId: sprint.id,
      unfinishedDestination: destination,
    })
    // Sprint is now locked
  }
</script>

<div class="sprint-complete-dialog">
  <h2>Complete Sprint: {sprint.name}</h2>
  <p>{sprint.startDate} → {sprint.endDate}</p>
  
  <div class="summary">
    <div class="stat">
      <span class="number">{completedTasks.length}</span>
      <span class="label">Tasks Completed</span>
    </div>
    <div class="stat">
      <span class="number">{unfinishedTasks.length}</span>
      <span class="label">Tasks Unfinished</span>
    </div>
  </div>
  
  <div class="destination-choice">
    <label>
      <input type="radio" bind:group={destination} value="backlog" />
      Move unfinished tasks to Backlog
    </label>
    <label>
      <input type="radio" bind:group={destination} value="next-sprint" />
      Move unfinished tasks to Next Sprint
    </label>
  </div>
  
  <div class="actions">
    <button class="secondary" on:click={() => dispatch('close')}>Cancel</button>
    <button class="primary" on:click={complete}>Complete Sprint</button>
  </div>
</div>
```

### Backend: Sprint Completion Logic

```typescript
// /packages/api/src/modules/sprint/sprint.service.ts
async function completeSprint(sprintId: string, destination: 'backlog' | 'next-sprint', userId: string) {
  const sprint = await getSprint(sprintId)
  
  if (sprint.status === 'completed') {
    throw new Error('Sprint already completed')
  }
  
  // 1. Lock sprint
  await db.update(sprints)
    .set({ status: 'completed' })
    .where(eq(sprints.id, sprintId))
  
  // 2. Freeze overlapping org_sessions
  await db.update(orgSessions)
    .set({ frozen: true })
    .where(
      and(
        eq(orgSessions.organizationId, sprint.organizationId),
        lte(orgSessions.startTime, sprint.endDate),
        or(
          isNull(orgSessions.endTime),
          gte(orgSessions.endTime, sprint.startDate)
        )
      )
    )
  
  // 3. Compute velocity snapshot
  const velocity = await computeVelocity(sprint.startDate, sprint.endDate, sprint.organizationId)
  
  // 4. Handle unfinished tasks
  const unfinishedTasks = await getUnfinishedTasks(sprintId)
  if (destination === 'backlog') {
    await db.update(tasks)
      .set({ sprintId: null })
      .where(eq(tasks.sprintId, sprintId))
  } else {
    const nextSprint = await getNextSprint(sprint.projectId)
    if (nextSprint) {
      await db.update(tasks)
        .set({ sprintId: nextSprint.id })
        .where(eq(tasks.sprintId, sprintId))
    }
  }
  
  // 5. Create audit log
  await createAuditLog({
    entityType: 'sprint',
    entityId: sprintId,
    action: 'completed',
    userId,
    field: 'status',
    oldValue: sprint.status,
    newValue: 'completed',
  })
  
  return { velocity, unfinishedCount: unfinishedTasks.length }
}
```

---

## Task Auto-Capture

### Model

When a task moves to "done", the system auto-captures completion data from the task's timestamps (`startedAt`, `completedAt`). No manual timer needed.

**Data Captured:**
- `startedAt` → when task entered `in_progress`
- `completedAt` → when task entered `done`
- `storyPoints` → complexity estimate
- `estimatedHours` → time estimate
- `actualElapsed` → `completedAt - startedAt` (wall-clock time)

**Sprint Estimation Accuracy:**

```
Throughput Accuracy = actual SP completed / planned SP
Time Efficiency = total estimatedHours of completed tasks / total org session hours
Per-Sprint Accuracy Trend = same metrics, tracked sprint-over-sprint
```

### Auto-Capture Edge Cases

#### Case 1: No Active Session

If engineer completes task but no org session is live:

```
System auto-creates a minimal org_sessions row:
- organizationId = task's org
- startTime = task.startedAt (backdated)
- endTime = task.completedAt
- note = "Auto-created: task completed without active session"
- tasksCompleted = 1
- storyPointsCompleted = task.storyPoints
- estimatedHoursSum = task.estimatedHours
```

#### Case 2: Cross-Org Completion

If engineer is clocked into Org B but drags an Org A task to "done":

```
Prompt: "This task belongs to [Org A], but you're clocked into [Org B]."
Options:
1. "Auto-create session for [Org A]" → backdated minimal session, credits task
2. "Switch to [Org A]" → stops Org B session, starts Org A session, completes task
3. "Cancel" → doesn't complete task
```

#### Case 3: Retroactive Completion

If engineer marks a task done from a previous day:

```
Auto-enrichment recomputes the affected org_session:
- tasksCompleted updated
- storyPointsCompleted updated
- estimatedHoursSum updated
- Sprint metrics stay live until sprint completes
```

---

## Sprint Flags

### Flag Values

| Flag | Auto-Assigned When | Manual Override |
|------|--------------------|-----------------|
| `unscheduled` (default) | Task enters active sprint via drag-and-drop from backlog | PM can change to any other flag |
| `pulled_forward` | PM manually assigns it | Manual only |
| `emergency` | PM manually assigns it | Manual only |
| `reopened` | Task marked done then dragged back to active sprint | Auto, but PM can change |

### Auto-Assignment Trigger

```typescript
// When task's sprintId changes to an active sprint
// AND task wasn't already in that sprint before it became active:
async function onTaskAssignedToActiveSprint(taskId: string, sprintId: string) {
  const sprint = await getSprint(sprintId)
  if (sprint.status === 'active') {
    await db.update(tasks)
      .set({ sprintFlag: 'unscheduled' })
      .where(eq(tasks.id, taskId))
  }
}
```

### Flag Management UI

**Location:** TaskDetail panel, sprint field section

**Behavior:**
- Only PM/admins can change flags
- Dropdown shows available flag options
- Current flag displayed as badge on task card
- Flags visible in velocity report

**Component:**

```svelte
<!-- /packages/web/src/lib/components/TaskDetail.svelte -->
<script lang="ts">
  import { user } from '$lib/stores/auth.svelte'
  
  const FLAG_OPTIONS = [
    { value: null, label: 'Planned' },
    { value: 'unscheduled', label: 'Unscheduled' },
    { value: 'pulled_forward', label: 'Pulled Forward' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'reopened', label: 'Reopened' },
  ]
  
  let canManageFlags = $derived($user?.role === 'admin' || $user?.role === 'owner')
</script>

{#if task.sprint}
  <div class="sprint-field">
    <label>Sprint</label>
    <span>{task.sprint.name}</span>
    
    {#if canManageFlags}
      <select bind:value={task.sprintFlag}>
        {#each FLAG_OPTIONS as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    {:else}
      <span class="flag-badge">{task.sprintFlag || 'Planned'}</span>
    {/if}
  </div>
{/if}
```

---

## API Endpoints

### Sprint

```
POST   /api/trpc/sprint.create        → Create sprint
POST   /api/trpc/sprint.complete      → Complete sprint (new)
GET    /api/trpc/sprint.list          → List sprints for project
GET    /api/trpc/sprint.byId          → Get sprint by ID
PUT    /api/trpc/sprint.update        → Update sprint
DELETE /api/trpc/sprint.delete        → Delete sprint
```

### Tasks (Modified)

```
POST   /api/trpc/task.changeStatus    → Now triggers auto-capture on "done"
```

### Org Sessions (Modified)

```
POST   /api/trpc/orgSession.create    → Now accepts backdated start_time
POST   /api/trpc/orgSession.stop      → Now triggers auto-enrichment
POST   /api/trpc/orgSession.recompute → Recompute enrichment for closed session
```

---

## Migration

### Migration File: `0004_sprint_completion_and_flags.sql`

```sql
-- Step 1: Add frozen column to org_sessions
ALTER TABLE org_sessions ADD COLUMN frozen BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Migrate existing review tasks to in_progress
UPDATE tasks SET status = 'in_progress' WHERE status = 'review';

-- Step 3: Remove review from valid status values (application-level enforcement)
-- No schema change needed - status is text, validation is in application code
```

---

## Testing Requirements

### Unit Tests

- [ ] Sprint creation creates sprint with correct data
- [ ] Sprint completion locks sprint
- [ ] Sprint completion freezes overlapping org_sessions
- [ ] Sprint completion computes velocity snapshot
- [ ] Sprint completion moves unfinished tasks correctly
- [ ] Task auto-capture creates session when no session exists
- [ ] Cross-org completion shows correct prompt
- [ ] Sprint flags auto-assigned on drag to active sprint
- [ ] Only PM/admins can change sprint flags

### Integration Tests

- [ ] Sprint board shows "New Sprint" button
- [ ] Sprint board shows "Complete Sprint" button for active sprints
- [ ] TaskDetail shows sprint flag management for PMs
- [ ] Velocity report shows flagged tasks
- [ ] Auto-enrichment recomputes on retroactive completion

### E2E Tests

- [ ] PM can create sprint, assign tasks, complete sprint
- [ ] Engineer can complete task and see it in timesheet
- [ ] Cross-org completion prompt works correctly
- [ ] Sprint flags visible in velocity report

---

## Dependencies

- L0 (Foundation) must be complete
- L1 (Multi-Org Core) must be complete
- Sprint board page exists
- TaskDetail panel exists

---

## Deliverables

1. ✅ Simplified status model: `todo → in_progress → done`
2. ✅ "New Sprint" button in sprint board header
3. ✅ Sprint completion workflow with confirmation dialog
4. ✅ Sprint completion locks org_sessions
5. ✅ Velocity snapshot on sprint completion
6. ✅ Unfinished tasks binary prompt (backlog vs next sprint)
7. ✅ Task auto-capture on status change to "done"
8. ✅ Auto-create session when no session exists
9. ✅ Cross-org completion prompt
10. ✅ Sprint flags auto-assigned on drag to active sprint
11. ✅ Sprint flags management UI (PM/admin only)
12. ✅ Sprint flags visible in TaskDetail and velocity report
13. ✅ Old `review` status migrated to `in_progress`

---

## Next Level

L2 completes the PM workflow cycle. L3 (Visibility & Intelligence) builds on this by adding timesheet views, velocity charts, estimation accuracy metrics, and personal velocity tracking.
