# Saha v2 Design Spec

**Date**: 2026-05-14
**Status**: Approved
**Supersedes**: None (first v2 design doc)
**Parent Contract**: `docs/ideation/saha/contract.md`

---

## 1. Vision & Strategy

Saha v1 is a feature-complete personal PM tool — workspaces, projects, tasks with NLP quick-add, Kanban boards, sprints, velocity tracking, and capacity planning. A single user with full access to everything they own.

v2 transforms Saha into a collaborative PM tool. The same PM now works with a team. They discuss work (comments), break tasks into pieces (checklists), understand what changed and why (activity feed), find anything instantly (Cmd+K), track time spent (timer), know who can do what (roles), get notified when things change (notifications), understand their team members (employee pages), and see what's coming (forecasting).

**Core principles:**
- **Additive, not destructive** — no existing v1 API, table, or component breaks
- **Two waves** — value-first features (Wave 1), then architectural changes (Wave 2)
- **Pattern consistency** — every new domain follows the v1 module pattern: router, service, schema, type
- **Simple over flexible** — two roles (Admin/Member), visual-only checklists, per-task activity feed

---

## 2. Two-Wave Structure

### Wave 1: High-Value, Low-Risk (ships first)

Five features users feel immediately. All additive — new tables, new routers, new components. Zero modifications to existing behavior.

| # | Feature | New DB Table | New Router | Key Decision |
|---|---------|-------------|------------|--------------|
| 1 | Polymorphic comments | `comments` | `comment` (5 procedures) | Tasks + Sprints + Projects |
| 2 | Visual checklists | `checklist_items` | `checklist` (6 procedures) | Checkboxes only, no status logic |
| 3 | Per-task activity feed | None (reads `audit_logs`) | None | Human-readable timeline in TaskDetail |
| 4 | Cmd+K command palette | None | `task.search` (1 procedure) | Search tasks + entities, navigate, quick-create |
| 5 | Global timer + manual time | `time_entries` | `timeEntry` (6 procedures) | Start/stop timer + manual entry |

### Wave 2: Architectural Changes (ships second)

Four features that touch existing routers or change how the system enforces access.

| # | Feature | New DB Table | New/Modified Router | Key Decision |
|---|---------|-------------|---------------------|--------------|
| 6 | Admin/Member roles | None | 7 procedures elevated to `adminProcedure` | tRPC middleware approach |
| 7 | In-app notifications | `notifications` | `notification` (4 procedures) | Bell icon, DB-stored, no email |
| 8 | Employee detail pages | None (aggregates data) | New page route | Velocity history + current workload |
| 9 | Backlog forecasting | None (pure computation) | `forecast.forProject` (1 query) | Sprint-by-sprint breakdown |

---

## 3. Wave 1 — Detailed Feature Design

### 3.1 Polymorphic Comments

**What**: Users can comment on tasks, sprints, and projects. Comments are threaded (flat list, ordered by creation time). Comments support @mention autocomplete from workspace members.

**Where**:
- **Tasks**: In the TaskDetail panel, below description, above activity feed
- **Sprints**: Collapsible comment section at the bottom of each SprintColumn on the Sprint Board
- **Projects**: Comment section on the Project page, below the Kanban/Sprints tabs

**Data model**:

```
comments
├── id              uuid PK
├── entityType      text NOT NULL    // 'task' | 'sprint' | 'project'
├── entityId        uuid NOT NULL
├── content         text NOT NULL
├── authorId        uuid FK → users
├── createdAt       timestamp
├── updatedAt       timestamp
│
Index: (entityType, entityId, createdAt)
```

**API**: `comment` router

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `list` | query | `{ entityType, entityId }` | `Comment[]` | Comments for an entity, ordered by createdAt ASC |
| `create` | mutation | `{ entityType, entityId, content }` | `Comment` | Creates comment, fires @mention notifications |
| `update` | mutation | `{ id, content }` | `Comment` | Author or admin only |
| `delete` | mutation | `{ id }` | `void` | Author or admin only |

**Authorization**:
- Any workspace member can read comments on entities they have access to
- Any workspace member can create comments
- Only comment author or workspace admin can update/delete comments (enforced in service layer, Wave 2 adds middleware for admin)

**@mention handling**:
- Parse `@username` patterns in comment content
- Match against workspace members (case-insensitive username match — same pattern as NLP parser)
- Create notification entries for mentioned users (Wave 2 — notifications table)
- In Wave 1, mentions are rendered as highlighted text but don't send notifications

**UI components**:
- `CommentList.svelte` — scrollable list, author avatar + name + timestamp + content
- `CommentInput.svelte` — textarea with submit, @mention autocomplete dropdown

### 3.2 Visual Checklists

**What**: Checkbox items within a task. No coupling to task status — a task can be completed with unchecked items. Items are reorderable via drag handles.

**Where**: Embedded in TaskDetail panel, below the task description, above comments.

**Data model**:

```
checklist_items
├── id              uuid PK
├── taskId          uuid FK → tasks ON DELETE CASCADE
├── content         text NOT NULL
├── isCompleted     boolean DEFAULT false
├── sortOrder       integer DEFAULT 0
├── createdAt       timestamp
│
Index: (taskId, sortOrder)
```

**API**: `checklist` router

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `list` | query | `{ taskId }` | `ChecklistItem[]` | Items sorted by sortOrder |
| `create` | mutation | `{ taskId, content }` | `ChecklistItem` | Appends with next sortOrder |
| `update` | mutation | `{ id, content }` | `ChecklistItem` | Edit item text |
| `toggle` | mutation | `{ id, isCompleted }` | `ChecklistItem` | Check/uncheck |
| `delete` | mutation | `{ id }` | `void` | Removes item |
| `reorder` | mutation | `{ taskId, itemIds[] }` | `void` | Bulk updates sortOrder based on new order |

**Behavior**:
- `create` automatically assigns `sortOrder = max(sortOrder) + 1` for the task
- `reorder` sends the full ordered list of IDs, backend updates sortOrder for each
- Progress indicator: "3/7 completed" shown in checklist header (computed on frontend)
- No validation on task status — unchecked items don't block task completion

**UI components**:
- `ChecklistBlock.svelte` — header with progress, add button, list of items with drag handles + checkboxes + delete buttons

### 3.3 Per-Task Activity Feed

**What**: Human-readable timeline of all changes to a task, rendered from the existing `audit_logs` table. No new database tables or API endpoints.

**Where**: Embedded in TaskDetail panel, below comments, as a collapsible section.

**Rendering rules**:
- `action = 'created'` → "Created by {userName}"
- `action = 'status_changed'` → "{userName} moved from {oldValue} to {newValue}"
- `action = 'updated'` → "{userName} changed {field} from {oldValue} to {newValue}"
- `action = 'deleted'` → N/A (feed only shown for existing tasks)
- Field names humanized: `dueDate` → "due date", `storyPoints` → "story points"
- Timestamps shown as relative: "2 hours ago", "yesterday", "3 days ago"

**Data source**: Existing `audit_logs` table, filtered by `entityType = 'task' AND entityId = {taskId}`, ordered by `createdAt DESC`, limited to 50 entries.

**UI components**:
- `ActivityTimeline.svelte` — vertical timeline with entries, author names, relative timestamps, field change details

### 3.4 Cmd+K Command Palette

**What**: Global command palette triggered by Cmd+K (or Ctrl+K). Fuzzy search across tasks + entities, navigate between views, and quick-create tasks using the NLP parser.

**Anchoring**: The `CommandPalette.svelte` component already exists in the codebase. v2 enhances it with real search + navigation + creation logic.

**Capabilities**:

1. **Search tasks** — Type any text, fuzzy matches against task titles and descriptions. Results show: task title, priority badge, project name, status. Click opens task in TaskDetail panel.

2. **Search all entities** — Prefixes control entity type search:
   - `t ` or plain text → tasks
   - `p ` → projects
   - `s ` → sprints
   - `@ ` → workspace members
   - Results from multiple entity types shown in categorized sections

3. **Navigate views** — `/home`, `/velocity`, `/projects` → navigate immediately. `/project/{name}` → fuzzy match project name.

4. **Quick-create tasks** — Start with `>` followed by NLP input: `> Fix login bug p1 tomorrow sp:3 @seif`. Uses existing `parseTaskInput` on the frontend. Shows preview of parsed fields before confirming. Creates task in the default inbox project.

**Backend**: `task.search` query procedure

```typescript
// Input: { query: string, workspaceIds: string[] }
// Output: { tasks: TaskSearchResult[], projects: ProjectSearchResult[], sprints: SprintSearchResult[], members: MemberSearchResult[] }
// Uses ILIKE for PostgreSQL fuzzy matching
```

**Design decision**: Cmd+K search is role-aware from the start (forward-compatible with Wave 2). In Wave 1, it returns all entities in the user's workspaces. In Wave 2, it filters admin-only entities from member results.

**UI components**:
- `CommandPalette.svelte` (enhanced) — overlay modal, search input at top, categorized results below, keyboard navigation (arrow keys + enter), ESC to close

### 3.5 Global Timer + Manual Time Entry

**What**: A global timer in the top bar lets users start/stop tracking time on a task. Manual entry allows logging hours directly. `actualHours` per task is derived from the sum of all time entries.

**Where**: Timer in the top bar (between workspace filter and notification bell). Time entries viewable in TaskDetail panel.

**Data model**:

```
time_entries
├── id              uuid PK
├── taskId          uuid FK → tasks ON DELETE CASCADE
├── userId          uuid FK → users
├── startTime       timestamp NOT NULL
├── endTime         timestamp            // null = still running
├── durationMinutes decimal              // computed on stop: (endTime - startTime) in minutes
├── note            text
├── isManual        boolean DEFAULT false // true = manually logged, false = timer
├── createdAt       timestamp
│
Index: (taskId), (userId)
Constraint: At most one running entry per user (endTime IS NULL) — enforced in application layer
```

**API**: `timeEntry` router

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `list` | query | `{ taskId }` | `TimeEntry[]` | All entries for a task |
| `running` | query | None | `TimeEntry \| null` | Current running entry for user |
| `start` | mutation | `{ taskId }` | `TimeEntry` | Starts timer. Rejects if already running. |
| `stop` | mutation | `{ id }` | `TimeEntry` | Stops timer, computes durationMinutes |
| `create` | mutation | `{ taskId, startTime, endTime, note? }` | `TimeEntry` | Manual entry (isManual = true) |
| `update` | mutation | `{ id, startTime?, endTime?, note? }` | `TimeEntry` | Edit entry |
| `delete` | mutation | `{ id }` | `void` | Delete entry |

**Timer behavior**:
- `start`: If a timer is already running, stop it first before starting the new one (only one running at a time)
- `stop`: Sets `endTime = now()`, computes `durationMinutes = (endTime - startTime) / 60000`
- `running`: Returns null if no timer running; frontend displays elapsed time polling every second
- Manual entries require both `startTime` and `endTime`; `durationMinutes` computed server-side
- `actualHours` for a task is computed as `SUM(durationMinutes) / 60` for all entries — displayed in TaskDetail and CapacityTable

**UI components**:
- `TimeTracker.svelte` — top bar component: task selector dropdown + start/stop button + elapsed display + "Log time" button for manual entry
- `TimeEntryForm.svelte` — modal/inline form: date pickers for start/end, hours field, note textarea
- Time section in TaskDetail: list of entries with edit/delete, total actualHours, button to start timer on this task

---

## 4. Wave 2 — Detailed Feature Design

### 4.1 Admin/Member Role Enforcement

**What**: Workspace members have one of two roles: Admin (full access) or Member (limited access). Enforced at the tRPC middleware level using a new `adminProcedure` factory.

**Role definitions**:
- **Admin** (and Owner): Can do everything — CRUD on all entities, manage workspace members, set capacity, delete projects/sprints
- **Member**: Can create/edit tasks and comments, view everything. Cannot delete projects, sprints, or manage workspace members. Cannot set capacity.

**Implementation**: `adminProcedure` middleware

```typescript
// packages/api/src/trpc.ts — new procedure factory
export const adminProcedure = protectedProcedure.use(
  t.middleware(async ({ ctx, next, rawInput }) => {
    // Derive workspaceId from input or entity lookup
    const workspaceId = await resolveWorkspaceId(ctx, rawInput)
    const role = await getMemberRole(ctx.user.id, workspaceId)
    
    if (role !== 'admin' && role !== 'owner') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' })
    }
    
    return next()
  }),
)
```

**Workspace resolution strategies** (how `adminProcedure` knows which workspace):
- Direct: input has `workspaceId` → use it
- Entity-derived: input has `projectId` → lookup project → get `workspaceId`
- Entity-derived: input has `sprintId` → lookup sprint → get project → get `workspaceId`
- Entity-derived: input has `taskId` → lookup task → get project → get `workspaceId`
- Comment: input has `entityType + entityId` → resolve entity → get workspace

**Procedures elevated to `adminProcedure`**:

| Router | Procedure | Workspace resolution |
|--------|-----------|---------------------|
| `project` | `delete` | Entity-derived (project → workspace) |
| `sprint` | `delete` | Entity-derived (sprint → project → workspace) |
| `workspace` | `create` | Direct (creates new workspace — any user can create) |
| `workspace` | `removeMember` | Direct (input has workspaceId) |
| `task` | `delete` | Entity-derived (task → project → workspace) |
| `capacity` | `set` | Entity-derived (sprint → project → workspace) |
| `comment` | `delete` (others' comments) | Entity-derived (resolved by entityType + entityId) |

**Note**: `workspace.create` remains accessible to all authenticated users — any user can create a company workspace (they become its owner). `workspace.removeMember` is a new procedure added in v2.

**Frontend impact**:
- Admin-only UI actions hidden from members: delete buttons on projects/sprints, capacity input fields, member management UI
- Current user's role available via `workspace.byId` or a dedicated `auth.session` enhancement

### 4.2 In-App Notifications

**What**: A bell icon in the top bar shows unread notification count. Clicking opens a dropdown of recent notifications. Notifications are created by the backend when key events occur.

**Where**: NotificationBell in the top bar (between TimeTracker and user avatar/profile).

**Data model**:

```
notifications
├── id              uuid PK
├── userId          uuid FK → users       // recipient
├── type            text NOT NULL         // 'assigned' | 'deadline_soon' | 'sprint_started' | 'sprint_ended' | 'mentioned'
├── title           text NOT NULL         // "Assigned to 'Fix login bug'"
├── body            text                  // Optional detail
├── entityType      text                  // 'task' | 'sprint' | 'project'
├── entityId        uuid                  // click opens this entity
├── isRead          boolean DEFAULT false
├── createdAt       timestamp
│
Index: (userId, isRead, createdAt DESC)
```

**Notification triggers**:

| Event | Type | Recipient | Fired when |
|-------|------|-----------|------------|
| Task assigned | `assigned` | New assignee | `task.create` or `task.update` changes `assigneeId` |
| Deadline approaching | `deadline_soon` | Assignee | On page load / scheduled check: task deadline within 24h AND status ≠ done |
| Sprint started | `sprint_started` | All workspace members | Sprint status transitions to 'active' |
| Sprint ended | `sprint_ended` | All workspace members | Sprint status transitions to 'completed' |
| Mentioned in comment | `mentioned` | Mentioned user | `comment.create` contains `@username` matching a workspace member |

**Implementation pattern**: Each trigger is a function called after the primary mutation. Follows the same fire-and-forget pattern as audit logging — notification failures don't surface to the user.

```typescript
// Example: createNotificationForAssignee(taskId, oldAssigneeId, newAssigneeId, actorUserId)
// Called after task.create or task.update. Only fires if assignee changed AND new assignee ≠ actor.
```

**API**: `notification` router

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `list` | query | `{ limit?, offset? }` | `Notification[]` | Recent notifications, newest first |
| `unreadCount` | query | None | `number` | Unread notification count |
| `markRead` | mutation | `{ id }` | `void` | Mark single notification as read |
| `markAllRead` | mutation | None | `void` | Mark all as read |

**Deadline notifications**: Not fired on a cron/scheduled job in v2. Instead, computed on page load — if any task has a deadline within 24h AND no notification exists for that task+user+type, create a notification. This avoids scheduler infrastructure for v2.

**UI components**:
- `NotificationBell.svelte` — bell icon with red badge count, dropdown of recent notifications, "Mark all read" button, click notification → navigate to entity

### 4.3 Employee Detail Pages

**What**: A dedicated page for each workspace member showing their velocity history, current sprint workload, and assigned tasks. Accessible from CapacityTable names, assignee chips on tasks, and @mentions.

**Route**: `/workspace/[wid]/member/[uid]`

**Page content**:
1. **Header**: User name, email, role badge, workspace name
2. **Velocity section**: Story points completed per sprint (last 4 sprints). Bar or simple metric display. Pulls from velocity engine filtered by `userId`.
3. **Current sprint**: Task count, estimated hours, capacity hours, load percentage. Same data as CapacityTable row, presented with more detail.
4. **Assigned tasks**: Filterable list (by status, project) of all tasks assigned to this user. Click opens task in TaskDetail.

**Backend**: No new tables. Data aggregated from existing tables:
- Tasks: `WHERE assigneeId = uid`
- Velocity: `velocity.custom` with `userId: uid`
- Capacity: `capacity.forSprint` filtered to this user

**UI components**:
- `EmployeePage` — new route page with sections described above

### 4.4 Backlog Forecasting

**What**: Given the project backlog and historical sprint velocity, predict which tasks will likely land in which future sprint.

**Where**: A ForecastView component on the Sprint Board page, as a collapsible section below the board.

**Algorithm**:
1. Get all backlog tasks (sprintId IS NULL) for the project, sorted by priority (P0 first)
2. Get average velocity (completedPoints per sprint) over the last 3 completed sprints
3. Fill future sprints: assign tasks to Sprint N+1 in priority order until total SP ≈ avg velocity, then Sprint N+2, etc.
4. If no completed sprints exist (no velocity data), display "Not enough data — complete at least one sprint"

**Display**:
- Summary: "{totalBacklogSP} SP in backlog. At {avgVelocity} SP/sprint, cleared in ~{sprintsNeeded} sprints"
- Sprint-by-sprint table: sprint name (placeholder), date estimate, SP allocation, task count
- Visual: bar chart or progress indicator per sprint

**Backend**: `forecast.forProject` query

```typescript
// Input: { projectId: string }
// Output: {
//   totalBacklogSP: number,
//   avgVelocity: number,
//   sprintsNeeded: number,
//   breakdown: Array<{ sprintNumber: number, estimatedDates: { start: Date, end: Date }, allocatedSP: number, taskCount: number }>
// }
```

**Edge cases**:
- No backlog: "Backlog is empty"
- No completed sprints: "Complete at least one sprint to see forecasts"
- Avg velocity = 0: "No velocity data — no story points completed in recent sprints"

**UI components**:
- `ForecastView.svelte` — summary metric + sprint breakdown table

---

## 5. Database Design

### 5.1 New Tables (4 total)

#### comments
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'sprint', 'project')),
  entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id, created_at);
CREATE INDEX idx_comments_author ON comments(author_id);
```

#### checklist_items
```sql
CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_checklist_task ON checklist_items(task_id, sort_order);
```

#### time_entries
```sql
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_minutes DECIMAL,
  note TEXT,
  is_manual BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_time_entries_task ON time_entries(task_id);
CREATE INDEX idx_time_entries_user ON time_entries(user_id);
-- Partial index for running entries check
CREATE UNIQUE INDEX idx_time_entries_running ON time_entries(user_id) WHERE end_time IS NULL;
```

#### notifications
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('assigned', 'deadline_soon', 'sprint_started', 'sprint_ended', 'mentioned')),
  title TEXT NOT NULL,
  body TEXT,
  entity_type TEXT CHECK (entity_type IN ('task', 'sprint', 'project')),
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
```

### 5.2 No Existing Table Modifications

All v1 tables (`users`, `workspaces`, `workspace_members`, `projects`, `sprints`, `tasks`, `audit_logs`, `employee_capacity`) remain unchanged. v2 is purely additive at the schema level.

### 5.3 Index Strategy

- **comments**: Composite index on (entityType, entityId, createdAt) — supports the primary access pattern (list comments for one entity, ordered by time)
- **checklist_items**: Composite index on (taskId, sortOrder) — supports ordered list fetch
- **time_entries**: Index on (taskId) for per-task listing; partial unique index on (userId WHERE endTime IS NULL) for one-running-entry constraint
- **notifications**: Composite index on (userId, isRead, createdAt DESC) — supports "show unread first" queries

---

## 6. API Design

### 6.1 New Routers (Wave 1)

#### comment router
```typescript
export const commentRouter = router({
  list: protectedProcedure
    .input(z.object({ entityType: z.enum(['task', 'sprint', 'project']), entityId: z.string().uuid() }))
    .query(({ input, ctx }) => commentService.list(input.entityType, input.entityId, ctx.user.id)),

  create: protectedProcedure
    .input(z.object({ entityType: z.enum(['task', 'sprint', 'project']), entityId: z.string().uuid(), content: z.string().min(1).max(5000) }))
    .mutation(({ input, ctx }) => commentService.create(input, ctx.user.id)),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid(), content: z.string().min(1).max(5000) }))
    .mutation(({ input, ctx }) => commentService.update(input.id, input.content, ctx.user.id)),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input, ctx }) => commentService.delete(input.id, ctx.user.id)),
})
```

#### checklist router
```typescript
export const checklistRouter = router({
  list: protectedProcedure
    .input(z.object({ taskId: z.string().uuid() }))
    .query(({ input, ctx }) => checklistService.list(input.taskId, ctx.user.id)),

  create: protectedProcedure
    .input(z.object({ taskId: z.string().uuid(), content: z.string().min(1).max(1000) }))
    .mutation(({ input, ctx }) => checklistService.create(input, ctx.user.id)),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid(), content: z.string().min(1).max(1000) }))
    .mutation(({ input, ctx }) => checklistService.update(input.id, input.content, ctx.user.id)),

  toggle: protectedProcedure
    .input(z.object({ id: z.string().uuid(), isCompleted: z.boolean() }))
    .mutation(({ input, ctx }) => checklistService.toggle(input.id, input.isCompleted, ctx.user.id)),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input, ctx }) => checklistService.delete(input.id, ctx.user.id)),

  reorder: protectedProcedure
    .input(z.object({ taskId: z.string().uuid(), itemIds: z.array(z.string().uuid()) }))
    .mutation(({ input, ctx }) => checklistService.reorder(input.taskId, input.itemIds, ctx.user.id)),
})
```

#### timeEntry router
```typescript
export const timeEntryRouter = router({
  list: protectedProcedure
    .input(z.object({ taskId: z.string().uuid() }))
    .query(({ input, ctx }) => timeEntryService.list(input.taskId, ctx.user.id)),

  running: protectedProcedure.query(({ ctx }) => timeEntryService.getRunning(ctx.user.id)),

  start: protectedProcedure
    .input(z.object({ taskId: z.string().uuid() }))
    .mutation(({ input, ctx }) => timeEntryService.start(input.taskId, ctx.user.id)),

  stop: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input, ctx }) => timeEntryService.stop(input.id, ctx.user.id)),

  create: protectedProcedure
    .input(z.object({ taskId: z.string().uuid(), startTime: z.string().datetime(), endTime: z.string().datetime(), note: z.string().optional() }))
    .mutation(({ input, ctx }) => timeEntryService.createManual(input, ctx.user.id)),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid(), startTime: z.string().datetime().optional(), endTime: z.string().datetime().optional(), note: z.string().optional() }))
    .mutation(({ input, ctx }) => timeEntryService.update(input.id, input, ctx.user.id)),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input, ctx }) => timeEntryService.delete(input.id, ctx.user.id)),
})
```

#### task.search (new procedure on existing task router)
```typescript
// Added to taskRouter:
search: protectedProcedure
  .input(z.object({ query: z.string().min(1), workspaceIds: z.array(z.string().uuid()).optional() }))
  .query(({ input, ctx }) => taskService.search(input.query, input.workspaceIds, ctx.user.id)),
```

### 6.2 New Routers (Wave 2)

#### notification router
```typescript
export const notificationRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20), offset: z.number().min(0).default(0) }))
    .query(({ input, ctx }) => notificationService.list(ctx.user.id, input.limit, input.offset)),

  unreadCount: protectedProcedure.query(({ ctx }) => notificationService.unreadCount(ctx.user.id)),

  markRead: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input, ctx }) => notificationService.markRead(input.id, ctx.user.id)),

  markAllRead: protectedProcedure.mutation(({ ctx }) => notificationService.markAllRead(ctx.user.id)),
})
```

#### forecast router
```typescript
export const forecastRouter = router({
  forProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(({ input, ctx }) => forecastService.forProject(input.projectId, ctx.user.id)),
})
```

#### workspace.removeMember (new procedure on existing workspace router)
```typescript
// Added to workspaceRouter, uses adminProcedure:
removeMember: adminProcedure
  .input(z.object({ workspaceId: z.string().uuid(), userId: z.string().uuid() }))
  .mutation(({ input, ctx }) => workspaceService.removeMember(input.workspaceId, input.userId, ctx.user.id)),
```

### 6.3 Root Router (Final State)

```typescript
export const appRouter = router({
  auth: authRouter,
  workspace: workspaceRouter,       // +removeMember (admin)
  project: projectRouter,           // delete elevated to admin
  task: taskRouter,                 // +search, delete elevated to admin
  sprint: sprintRouter,             // delete elevated to admin
  velocity: velocityRouter,
  capacity: capacityRouter,         // set elevated to admin
  comment: commentRouter,           // new
  checklist: checklistRouter,       // new
  timeEntry: timeEntryRouter,       // new
  notification: notificationRouter, // new (Wave 2)
  forecast: forecastRouter,         // new (Wave 2)
})
```

---

## 7. UI Component Inventory

### 7.1 New Components (9 total)

**Wave 1** (6 components):

| Component | File Path | Dependencies |
|-----------|-----------|--------------|
| `CommentList` | `packages/web/src/lib/components/CommentList.svelte` | trpc.comment |
| `CommentInput` | `packages/web/src/lib/components/CommentInput.svelte` | trpc.comment, workspace members store |
| `ChecklistBlock` | `packages/web/src/lib/components/ChecklistBlock.svelte` | trpc.checklist |
| `ActivityTimeline` | `packages/web/src/lib/components/ActivityTimeline.svelte` | trpc.task.byId (audit_logs via task relations) |
| `TimeTracker` | `packages/web/src/lib/components/TimeTracker.svelte` | trpc.timeEntry |
| `TimeEntryForm` | `packages/web/src/lib/components/TimeEntryForm.svelte` | trpc.timeEntry |

**Wave 2** (3 components):

| Component | File Path | Dependencies |
|-----------|-----------|--------------|
| `NotificationBell` | `packages/web/src/lib/components/NotificationBell.svelte` | trpc.notification |
| `ForecastView` | `packages/web/src/lib/components/ForecastView.svelte` | trpc.forecast |
| `EmployeePage` | `packages/web/src/routes/(app)/workspace/[wid]/member/[uid]/+page.svelte` | trpc.task, trpc.velocity, trpc.capacity |

### 7.2 Modified Components (3 total)

| Component | Changes |
|-----------|---------|
| `TaskDetail.svelte` | Scrollable layout with sections: Task Details → Checklist → Time → Activity → Comments |
| `(app)/+layout.svelte` | Add TimeTracker and NotificationBell to top bar slots (currently placeholder) |
| `CommandPalette.svelte` | Wire to `task.search` API, add navigation + quick-create logic |

### 7.3 New Routes (1 total)

| Route | File | Wave |
|-------|------|------|
| `/workspace/[wid]/member/[uid]` | `packages/web/src/routes/(app)/workspace/[wid]/member/[uid]/+page.svelte` | Wave 2 |

---

## 8. Implementation Strategy

### 8.1 Phasing Recommendation

**Wave 1 → Wave 2, sequential.** Wave 1 has no dependencies on Wave 2. Wave 2's role enforcement touches Wave 1's comment router (comment delete becomes admin-guarded), but this is a one-line change (swap `protectedProcedure` for `adminProcedure`).

Within each wave, features can be built in parallel since they're independent:
- **Wave 1 parallel tracks**: Comments + Checklists → same entity (TaskDetail), but different tables/routers. Cmd+K + Timer → independent from task features.

Recommended Wave 1 phase order:
1. **Phase W1-1**: Database tables (comments, checklist_items, time_entries) + Drizzle schema + migrations
2. **Phase W1-2**: Backend routers (comment, checklist, timeEntry) + task.search procedure
3. **Phase W1-3**: Frontend components (CommentList, CommentInput, ChecklistBlock, ActivityTimeline, TimeTracker, TimeEntryForm) + TaskDetail redesign
4. **Phase W1-4**: Cmd+K enhancement (CommandPalette wiring to task.search API)

Recommended Wave 2 phase order:
1. **Phase W2-1**: adminProcedure middleware + elevate 7 procedures
2. **Phase W2-2**: notifications table + router + NotificationBell component
3. **Phase W2-3**: Employee detail page
4. **Phase W2-4**: Forecasting (forecast router + ForecastView)

### 8.2 Risk Assessment

| Risk | Wave | Impact | Mitigation |
|------|------|--------|------------|
| `adminProcedure` workspace resolution incorrect | W2 | Access control bypass | Test every elevated procedure with both admin and member users |
| Timer partial unique index conflict | W1 | Cannot start timer | Test concurrent start attempts; handle gracefully in service |
| Comment @mention parsing duplicates | W1 | Multiple notifications for same mention | Deduplicate by (userId, type, entityType, entityId) before insert |
| TaskDetail becomes too tall | W1 | Poor UX on small screens | Collapsible sections; Activity feed collapsed by default |
| Cmd+K search slow with many tasks | W1 | Palpable lag on keystroke | PostgreSQL ILIKE with LIMIT 10; debounce input by 150ms |
| Forecasting with 0 velocity | W2 | Division by zero | Guard: return "Not enough data" message |

### 8.3 Validation Commands

```bash
# After each phase:
bun run --filter '*' typecheck
bun run --filter api test
bun db:generate && bun db:migrate
bun dev
```

### 8.4 Dependencies (External)

- **PostgreSQL**: Already configured (v1 database)
- **WorkOS**: Already configured (v1 auth)
- **No new external services** — v2 is self-contained (no email provider, no scheduler)

---

## 9. Out of Scope (Explicitly Excluded from v2)

These Future Consideration items from the v1 contract are **NOT** in v2:

- **Email notifications** — Notification infrastructure is in-app only
- **Role management beyond Admin/Member** — No custom roles, no granular RBAC
- **Saved filter presets** — Session-reset behavior remains
- **Subtask nesting** — Checklists cover the breakdown need
- **Mobile app** — Responsive web layout only
- **Real-time updates (WebSocket)** — Manual refresh sufficient
- **Markdown files & documents** — External docs tools cover this
- **MCP server** — Post-v2 priority
- **Global activity feed** — Per-task only in the detail panel

---

*Approved by Seif Al Motaz. Ready for ideation pipeline (contract → phasing → specs).*
