# Implementation Spec: Saha - Phase 2

**Contract**: ./contract.md
**PRD**: ./prd-phase-2.md
**Estimated Effort**: L

## Technical Approach

Phase 2 is the largest phase — it delivers the core PM experience. We build the workspace management system (list, join via WorkOS, top-bar multi-select filter), project CRUD, the full task management system with NLP quick-add parsing, a drag-and-drop Kanban board, the compact task modal, and the comprehensive audit logging infrastructure.

The backend follows the modular pattern established in Phase 1. Each domain (workspace, project, task) gets its own module with route/service/schema/type files. The NLP parser is a pure function in the task service — it accepts a raw string, extracts p0-p3/sp:N/@user/date patterns, strips them from the title, and returns a structured task object.

On the frontend, the Kanban board is the central reusable component. It renders 4 columns, each containing draggable TaskCards. The same KanbanBoard is used on Home (with workspace filters) and in Project view. Drag-and-drop uses pointer events. The workspace filter dropdown in the top bar is a Svelte component that reads workspace state from a store and emits filter changes.

Audit logging is a cross-cutting concern. Every mutation in the API triggers an audit log write via a shared audit service. The audit service is called from within each module's service layer.

## Feedback Strategy

**Inner-loop command**: `bun run --filter api test`

**Playground**: Test suite for backend logic (NLP parser, audit, service methods). Dev server for UI interaction (Kanban drag, modal, filter).

**Why this approach**: The NLP parser, audit system, and service logic are deterministic and test-heavy. UI components are interaction-heavy and best validated in the browser via the dev server.

## File Changes

### New Files

| File Path | Purpose |
|---|---|
| `packages/api/src/modules/workspace/workspace.route.ts` | Workspace endpoints: list, get, create company workspace, join |
| `packages/api/src/modules/workspace/workspace.service.ts` | Workspace logic: list user workspaces, auto-join via WorkOS org |
| `packages/api/src/modules/workspace/workspace.schema.ts` | Elysia validation schemas |
| `packages/api/src/modules/workspace/workspace.type.ts` | Workspace-related types |
| `packages/api/src/modules/project/project.route.ts` | Project endpoints: CRUD, list by workspace |
| `packages/api/src/modules/project/project.service.ts` | Project logic |
| `packages/api/src/modules/project/project.schema.ts` | Validation schemas |
| `packages/api/src/modules/project/project.type.ts` | Project types |
| `packages/api/src/modules/task/task.route.ts` | Task endpoints: CRUD, status transitions, list with filters |
| `packages/api/src/modules/task/task.service.ts` | Task logic: NLP parser, status transitions, dwell time |
| `packages/api/src/modules/task/task.schema.ts` | Validation schemas |
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
| `packages/web/src/lib/stores/workspaces.ts` | Svelte store: all workspaces, active filters |
| `packages/web/src/lib/stores/tasks.ts` | Svelte store: current tasks, cache |
| `packages/web/src/routes/(app)/home/+page.svelte` | Home page: Kanban with workspace filter |
| `packages/web/src/routes/(app)/projects/+page.svelte` | Projects listing page |
| `packages/web/src/routes/(app)/project/[id]/+layout.svelte` | Project layout: Kanban + Sprints tabs |
| `packages/web/src/routes/(app)/project/[id]/kanban/+page.svelte` | Project Kanban view |
| `packages/web/src/routes/(app)/project/[id]/sprints/+page.svelte` | Project Sprint Board (stub for Phase 3) |

### Modified Files

| File Path | Changes |
|---|---|
| `packages/api/src/index.ts` | Mount workspace, project, task route modules |
| `packages/web/src/routes/(app)/+layout.svelte` | Wire WorkspaceFilter, DeadlineBadge into top bar; import workspace store |
| `packages/web/src/lib/eden.ts` | Add workspace, project, task API methods via Eden inference |

### Deleted Files

None.

## Implementation Details

### 1. NLP Parser (Task Service)

**Overview**: Pure function that accepts a raw input string and returns parsed task fields plus the cleaned title.

```typescript
// nlp-parser.ts
interface ParsedTaskInput {
  title: string;
  priority?: 'p0' | 'p1' | 'p2' | 'p3';
  dueDate?: Date;
  storyPoints?: number;
  assigneeUsername?: string;
}

function parseTaskInput(input: string): ParsedTaskInput {
  let remaining = input;

  // Extract priority: p0, p1, p2, p3 (case-insensitive)
  const priorityMatch = remaining.match(/\bp([0-3])\b/i);
  const priority = priorityMatch ? `p${priorityMatch[1]}` as ParsedTaskInput['priority'] : undefined;
  if (priorityMatch) remaining = remaining.replace(priorityMatch[0], '');

  // Extract story points: sp:5, sp:0.5, sp:13
  const spMatch = remaining.match(/\bsp:(\d+(?:\.\d+)?)\b/i);
  const storyPoints = spMatch ? parseFloat(spMatch[1]) : undefined;
  if (spMatch) remaining = remaining.replace(spMatch[0], '');

  // Extract assignee: @username
  const assigneeMatch = remaining.match(/@(\w+)/);
  const assigneeUsername = assigneeMatch ? assigneeMatch[1] : undefined;
  if (assigneeMatch) remaining = remaining.replace(assigneeMatch[0], '');

  // Extract due date: today, tomorrow, yesterday, YYYY-MM-DD, day names
  const datePatterns = [
    { pattern: /\btoday\b/i, getDate: () => new Date() },
    { pattern: /\btomorrow\b/i, getDate: () => { const d = new Date(); d.setDate(d.getDate() + 1); return d; } },
    { pattern: /\byesterday\b/i, getDate: () => { const d = new Date(); d.setDate(d.getDate() - 1); return d; } },
    { pattern: /\b\d{4}-\d{2}-\d{2}\b/, getDate: (m: string) => new Date(m) },
    { pattern: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, getDate: (m: string) => nextDayOfWeek(m) },
  ];

  let dueDate: Date | undefined;
  for (const { pattern, getDate } of datePatterns) {
    const match = remaining.match(pattern);
    if (match) {
      dueDate = getDate(match[0]);
      remaining = remaining.replace(match[0], '');
      break; // Only extract one date
    }
  }

  return {
    title: remaining.trim().replace(/\s+/g, ' '),
    priority,
    storyPoints,
    assigneeUsername,
    dueDate,
  };
}
```

**Key decisions**:
- Parser is a pure synchronous function — no DB calls. Assignee resolution (username → user ID) happens in the service layer after parsing
- Only one of each token type extracted (first match wins)
- Day names (monday, friday) resolve to next occurrence of that day

**Implementation steps**:
1. Create `nlp-parser.ts` with the `parseTaskInput` function
2. Implement `nextDayOfWeek` helper
3. Handle edge cases: empty string returns `{ title: '' }`, mixed case (P1, p1), tokens adjacent to punctuation

**Feedback loop**:
- **Playground**: Write `nlp-parser.spec.ts` before implementing the parser (TDD)
- **Experiment**: Test: `"Fix bug p1"` → priority p1, title "Fix bug". `"sp:3 p0 task"` → priority p0, sp 3, title "task". `"No shortcuts here"` → title only. `"p1 tomorrow @seif sp:5"` → all extracted
- **Check command**: `bun run --filter api test -- nlp-parser`

### 2. Audit Service

**Overview**: Shared service called by every module's service layer on mutation. Append-only writes to `audit_logs` table.

```typescript
// shared/audit/audit.service.ts
interface AuditEntry {
  entityType: 'task' | 'project' | 'sprint' | 'workspace' | 'file';
  entityId: string;
  action: 'created' | 'updated' | 'deleted' | 'status_changed';
  field?: string;
  oldValue?: string;
  newValue?: string;
  userId: string;
}

async function createAuditLog(entry: AuditEntry): Promise<void> {
  await db.insert(auditLogs).values({
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  })
}
```

**Key decisions**:
- Audit writes are fire-and-forget (not awaited in the critical path) — performance over guarantee
- Values are stringified if complex (objects, arrays → JSON.stringify)
- No query endpoint for audit logs in v1 (data stored, consumed in UI later)

**Implementation steps**:
1. Create `audit.service.ts` with `createAuditLog` function
2. Integrate into task service on create, update, and status change
3. Integrate into project and workspace services

**Feedback loop**:
- **Playground**: Test via task creation flow
- **Experiment**: Create a task, query `audit_logs` table, verify entry exists with correct entityType, action, userId
- **Check command**: `bun run --filter api test -- audit`

### 3. Workspace Module

**Overview**: Lists workspaces for authenticated user, creates company workspaces from WorkOS org membership.

```typescript
// workspace.service.ts
async function listUserWorkspaces(userId: string): Promise<Workspace[]> {
  return db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.userId, userId),
    with: { workspace: true }
  }).then(rows => rows.map(r => r.workspace))
}

async function createCompanyWorkspace(name: string, companyId: string, userId: string): Promise<Workspace> {
  // Create workspace with type='company', companyId set
  // Auto-add creator as owner member
}
```

**Implementation steps**:
1. Implement list (returns all workspaces user is a member of)
2. Implement creation for company workspaces
3. Top-bar filter reads workspace list from store
4. Filter persists selected workspace IDs in store, triggers task re-fetch

### 4. Project Module

**Overview**: Standard CRUD with workspace scoping.

```typescript
// project.route.ts
const projectRoutes = new Elysia({ prefix: '/projects' })
  .get('/', ({ query, user }) => listByWorkspace(query.workspaceId, user.id))
  .post('/', ({ body, user }) => createProject({ ...body, createdBy: user.id }))
  .get('/:id', ({ params }) => getProject(params.id))
  .patch('/:id', ({ params, body }) => updateProject(params.id, body))
  .delete('/:id', ({ params }) => deleteProject(params.id))
```

**Implementation steps**:
1. CRUD endpoints with workspaceId filter on list
2. Project created in default workspace if no workspaceId provided
3. Projects listing page groups by workspace

### 5. Task Module

**Overview**: Full CRUD with NLP parse endpoint, status transitions, and filtered list.

```typescript
// task.route.ts
const taskRoutes = new Elysia({ prefix: '/tasks' })
  .get('/', ({ query }) => listTasks(query)) // filters: workspaceIds, projectId, sprintId, status, assigneeId
  .post('/', ({ body, user }) => createTask(body, user.id))
  .get('/:id', ({ params }) => getTask(params.id))
  .patch('/:id', ({ params, body, user }) => updateTask(params.id, body, user.id))
  .delete('/:id', ({ params }) => deleteTask(params.id))
  .post('/:id/status', ({ params, body, user }) => transitionStatus(params.id, body.status, user.id))
  .post('/parse', ({ body }) => ({ result: parseTaskInput(body.input) }))
```

**Key decisions**:
- Status transitions handled via dedicated endpoint (not generic PATCH) because they trigger additional logic: timestamps, dwell time, audit grouping
- `POST /parse` is a convenience endpoint so the frontend can preview parsed fields before creation
- Task list endpoint accepts comma-separated workspaceIds to support multi-workspace filtering

**Implementation steps**:
1. Create task endpoint: accepts raw fields OR an `input` string for NLP parsing
2. List endpoint: supports pagination, workspace filter (multiple IDs), project, status, assignee filters
3. Status transition endpoint: updates status, manages timestamps (startedAt on to In Progress, completedAt on to Done, clears completedAt on reopen)
4. Generic update endpoint: any field change, triggers audit log per changed field

**Feedback loop**:
- **Playground**: Test via curl or dev server
- **Experiment**: POST task with NLP input, verify parsed fields. PATCH task title, verify audit log entry. POST status change, verify timestamps
- **Check command**: `bun run --filter api test -- task`

### 6. Kanban Board (Svelte)

**Overview**: Reusable drag-and-drop Kanban board used on Home and Project pages.

```svelte
<!-- KanbanBoard.svelte -->
<script lang="ts">
  export let tasks: Task[];
  export let columns = ['todo', 'in_progress', 'review', 'done'];
  export let onStatusChange: (taskId: string, newStatus: string) => void;

  $: tasksByColumn = columns.reduce((acc, col) => {
    acc[col] = tasks.filter(t => t.status === col);
    return acc;
  }, {});

  function handleDrop(taskId: string, targetColumn: string) {
    onStatusChange(taskId, targetColumn);
  }
</script>

<div class="kanban-board">
  {#each columns as column}
    <KanbanColumn
      {column}
      tasks={tasksByColumn[column]}
      onDrop={(taskId) => handleDrop(taskId, column)}
    />
  {/each}
</div>
```

**Implementation steps**:
1. Create KanbanColumn: renders column header + list of TaskCards
2. Create TaskCard: displays title, due date, priority badge, project label, dwell time
3. Implement drag-and-drop using `pointermove` events (avoiding browser default drag for mobile compat)
4. On drop: call API to update task status
5. Compute dwell time: `now - statusChangedAt` formatted as "Xd" or "Xh"

**Feedback loop**:
- **Playground**: Dev server → Home page
- **Experiment**: Create 3 tasks, drag one from To Do to In Progress, verify API call, verify dwell time updates on card. Drag to Done, verify card moves/removes
- **Check command**: `bun dev` (visual verification)

### 7. Task Modal

**Overview**: Compact modal with dominant input, flex-row metadata chips.

```
┌──────────────────────────────────────┐
│  Fix login bug                       │ ← large title input
│                                      │
│  [P1 ▼] [Today ▼] [SP:3 ▼] [@ahmed ▼] [+Sprint] │ ← chips row
│                                      │
│  Deadline: [────────────]            │
│                                      │
│  Description                         │
│  ┌────────────────────────────────┐  │
│  │                                │  │
│  └────────────────────────────────┘  │
│                                      │
│  [Save] [Cancel]                    │
└──────────────────────────────────────┘
```

**Implementation steps**:
1. Modal opens when clicking a task card or the "add with details" button
2. Each chip button opens a small dropdown: priority (4 options), date (date picker), SP (number input), assignee (user list), sprint (sprint selector)
3. Deadline field is inline in the modal (not a chip) to distinguish it from the due date
4. Changes auto-save on close or on explicit Save button
5. Each field change triggers a PATCH to the API

**Feedback loop**:
- **Playground**: Dev server → click a task
- **Experiment**: Open task, change priority via chip dropdown, close → verify task card reflects new priority
- **Check command**: `bun dev` (visual verification)

### 8. Workspace Filter (Top Bar)

**Overview**: Multi-select dropdown with checkboxes for workspace filtering.

```svelte
<!-- WorkspaceFilter.svelte -->
<script lang="ts">
  import { workspaces, activeFilterIds } from '$lib/stores/workspaces';

  function toggleWorkspace(id: string) {
    activeFilterIds.update(ids => {
      const idx = ids.indexOf(id);
      if (idx >= 0) return ids.filter(i => i !== id);
      return [...ids, id];
    });
  }
</script>

<button on:click={() => open = !open}>
  Workspaces ({activeFilterIds.length})
</button>
{#if open}
  <div class="dropdown">
    <label><input type="checkbox" checked={isAll} on:change={selectAll}>All Workspaces</label>
    {#each $workspaces as ws}
      <label><input type="checkbox" checked={$activeFilterIds.includes(ws.id)} on:change={() => toggleWorkspace(ws.id)}>{ws.name}</label>
    {/each}
  </div>
{/if}
```

**Implementation steps**:
1. Read workspaces from store (loaded on app mount)
2. Update active filter IDs on toggle
3. Reset to "All" on session expiry / new login
4. Task list re-fetches when filter changes

### 9. Deadline Warning Badge

**Overview**: Persistent badge in top bar showing count of overdue tasks.

```svelte
<!-- DeadlineBadge.svelte -->
<script lang="ts">
  export let overdueCount: number;
</script>

{#if overdueCount > 0}
  <span class="deadline-badge" title={`${overdueCount} tasks overdue`}>
    {overdueCount} overdue
  </span>
{/if}
```

**Implementation steps**:
1. Compute overdue count: tasks where `deadline < now` AND `status !== 'done'`
2. Fetch count on app load and after any task update
3. Show red badge in top bar

## API Design

### New Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/workspaces` | List user's workspaces |
| `POST` | `/workspaces` | Create a company workspace |
| `GET` | `/workspaces/:id` | Get workspace details |
| `GET` | `/workspaces/:id/members` | List workspace members |
| `GET` | `/projects` | List projects (opt filter: ?workspaceId=) |
| `POST` | `/projects` | Create project |
| `GET` | `/projects/:id` | Get project |
| `PATCH` | `/projects/:id` | Update project |
| `DELETE` | `/projects/:id` | Delete project |
| `GET` | `/tasks` | List tasks (filters: workspaceIds, projectId, sprintId, status, assigneeId) |
| `POST` | `/tasks` | Create task (raw fields or input string for NLP) |
| `GET` | `/tasks/:id` | Get task detail |
| `PATCH` | `/tasks/:id` | Update task fields |
| `DELETE` | `/tasks/:id` | Delete task |
| `POST` | `/tasks/:id/status` | Transition task status |
| `POST` | `/tasks/parse` | Parse NLP input, return structured result |

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|---|---|
| `packages/api/src/modules/task/nlp-parser.spec.ts` | All parser patterns, edge cases, mixed input |
| `packages/api/src/shared/audit/audit.spec.ts` | Audit entry creation, field mapping |
| `packages/api/src/modules/workspace/workspace.service.spec.ts` | List, create, join |
| `packages/api/src/modules/task/task.service.spec.ts` | Create (NLP and raw), status transitions, dwell time calc |

**Key test cases**:
- NLP parser: `""` → `{ title: "" }`
- NLP parser: `"task p1"` → title="task", priority="p1"
- NLP parser: `"p0 sp:13 @ahmed tomorrow Review UI"` → all extracted
- NLP parser: `"sp:0.5"` → storyPoints=0.5
- NLP parser: `"monday task"` → dueDate = next Monday
- Status transition: todo → in_progress sets started timestamp
- Status transition: in_progress → done sets completedAt
- Status transition: done → in_progress clears completedAt
- Audit: task creation generates `created` audit entry
- Audit: task update generates `updated` entry with field/old/new values

### Integration Tests

| Test File | Coverage |
|---|---|
| `packages/api/src/modules/task/task.integration.spec.ts` | Full task lifecycle: create → update → status changes → delete |
| `packages/api/src/modules/workspace/workspace.integration.spec.ts` | Workspace creation with members |

### Manual Testing

- [ ] Type `"Fix bug p1 tomorrow sp:3"` in quick-add → task appears in To Do with all fields
- [ ] Type `"Just a title"` → task appears with title only
- [ ] Drag task from To Do → In Progress → dwell time appears on card
- [ ] Drag from In Progress → Review → Review
- [ ] Drag to Done → card moves to Done column
- [ ] Set deadline to yesterday → top bar shows "1 overdue"
- [ ] Open task modal → change priority via chip → card updates
- [ ] Open workspace filter → uncheck a workspace → that workspace's tasks disappear from kanban
- [ ] Create project → project appears on Projects page
- [ ] Project kanban tab shows only that project's tasks

## Error Handling

| Error Scenario | Handling Strategy |
|---|---|
| NLP input is only whitespace | Return 400 "Title is required" |
| Task update on deleted task | Return 404 "Task not found" |
| Status transition: done → blocked (invalid) | Return 400 "Invalid status transition" |
| Assignee not a workspace member | Return 400 "User is not a member of this workspace" |
| Project creation without workspaceId | Default to user's personal workspace |
| Concurrent task updates | Last-write-wins (no optimistic locking in v1) |
| Workspace name empty | Return 400 "Workspace name is required" |

## Failure Modes

| Component | Failure Mode | Trigger | Impact | Mitigation |
|---|---|---|---|---|
| NLP Parser | Silent token consumption | User types "sp:3" meaning something else (not story points) | Story points incorrectly set to 3 | Accept risk; token vocabulary is narrow enough that collisions are unlikely |
| NLP Parser | Date ambiguity | User types "task friday" on Friday → does it mean today or next Friday? | Date set to next week (7 days away) vs. today | Resolve to next occurrence (≥ today). If today is Friday, "friday" = today |
| KanbanBoard | Optimistic UI inconsistency | User drags card, API call fails, card snaps back | Brief visual glitch, confusing | Implement optimistic update + rollback on error; show toast "Failed to move task" |
| Audit | Silent audit failure | Database error during audit write, but primary mutation succeeds | Audit gap — task updated but no log entry | Fire-and-forget audit writes; accept rare gaps for v1 |
| Workspace Filter | Session reset on page refresh | Browser refresh clears activeFilters store | Filter resets to "All" unexpectedly | Documented behavior (session-reset); future: persist to query params or localStorage |

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

- [ ] Determine workspace filter persistence strategy: cookie vs. query params vs. localStorage (currently: session-reset)
- [ ] Define exact dwell time display format: "3d" vs "3 days" vs "72h"

---

_This spec is ready for implementation. Follow the patterns and validate at each step._
