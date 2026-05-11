# Saha — Product Requirements Document

**Version**: 1.0
**Date**: 2026-05-10
**Author**: Seif Al Motaz

---

## 1. Product Purpose

Saha is a project management tool for people who work across multiple contexts — a day job, freelance work, personal projects — and need real PM capabilities without the complexity of Jira or the shallowness of Trello.

The tool treats you as one person with many work identities, not as separate accounts. It gives you sprint management, velocity tracking, capacity planning, timesheets, and document management — all in one place, with a privacy-safe interface designed for screen sharing in meetings.

---

## 2. Core Concepts

### 2.1 The User

A single user has one account. They can have:

- **A personal workspace** — their private space for self-tracking, personal projects, or solo work. Created automatically on signup.
- **One or more company workspaces** — joined via invitation (WorkOS). Each company can have multiple workspaces (e.g., "Dev Team", "Marketing Team"). Within each workspace there are projects.

### 2.2 Workspaces

A workspace is the container for projects. There are two types:

- **Personal workspace**: One per user. Private. No members. No company attached.
- **Company workspace**: Belongs to a company (WorkOS organization). Has members with roles. A single company can have multiple workspaces to separate teams or departments.

### 2.3 Projects

A project lives inside a workspace. It contains tasks, sprints, and files. A project has its own Kanban board and Sprint Board.

### 2.4 Sprints

A sprint is a time-boxed period for completing work. Sprints have flexible duration — one week, two weeks, ten days, any start and end date the user chooses. Sprints belong to a project.

**Key distinction**: A task belongs to a sprint (it is assigned to that sprint). But velocity is measured by **when work was completed**, not by which sprint owns the task. If a task from Sprint 3 gets done during Sprint 2's date window, Sprint 2 counts the completed points.

### 2.5 Tasks

A task is the fundamental unit of work. Every task has a status, priority, story points, due date, deadline, assignee, and can belong to a sprint. Tasks live inside projects.

---

## 3. Navigation & Layout

### 3.1 Sidebar

The sidebar is minimal and privacy-safe. It never shows workspace or company names — only generic navigation items:

- **Home** — today's task kanban
- **Velocity** — cross-workspace velocity overview
- **Projects** — list of all projects across workspaces

No workspace names, company names, or project names appear in the sidebar. This ensures nothing sensitive is visible during screen sharing in meetings.

### 3.2 Top Bar

The top bar contains:

- **Workspace filter** — a dropdown button. Clicking it shows all workspaces the user belongs to, with checkboxes. The user can select which workspaces and projects to show in the Home view. This is a multi-select filter, not a context switcher. Selections reset each session (defaults to "All" on fresh login).
- **Global timer** — a Start/Stop button for the universal timesheet timer. Shows elapsed time when running.
- **Notification bell** — shows unread notification count. Clicking opens a dropdown of recent notifications.
- **Search** — triggered by `Cmd+K`. Opens a global search palette.

### 3.3 Home View

The Home page is the default landing page after login. It shows:

- A Kanban board with four columns: **To Do**, **In Progress**, **Review**, **Done**
- Tasks displayed are filtered by whatever workspaces and projects are selected in the top bar filter
- The default view shows all tasks from all workspaces combined

### 3.4 Project View

When a user opens a project, they see the project detail page with two tabs:

- **Kanban** — the project's Kanban board (To Do, In Progress, Review, Done)
- **Sprints** — the Sprint Board for this project, with sub-tabs: Board and Capacity

### 3.5 Velocity Page (Global)

The global Velocity page shows velocity aggregated across all workspaces. Same velocity calculation formula but applied to everything the user can see.

### 3.6 Velocity Page (Workspace Level)

Each workspace has its own Velocity page showing cross-project velocity within that workspace.

### 3.7 Employee Page

A dedicated page for each employee, accessible only to PMs and admins. Shows:

- Velocity history for that employee
- Current tasks the employee is working on, filterable by project and workspace
- Sprint contribution history
- Estimated vs. actual hours accuracy

---

## 4. Tasks

### 4.1 Task Card

When a task appears on a Kanban board, the card shows:

- **Title** — the task name
- **Due date** — the target completion date
- **Priority** — indicated by a colored badge (P0 = red/critical, P1 = orange/high, P2 = yellow/medium, P3 = gray/low)
- **Project label** — which project this task belongs to
- **Column dwell time** — how long the task has been sitting in its current column (e.g., "3 days in Review")

### 4.2 Deadline Warning

Tasks can have a hard deadline (separate from due date). When a task passes its deadline:

- The card gets a red visual treatment
- A persistent counter appears in the top bar showing how many overdue tasks exist (e.g., "2 overdue")

### 4.3 Creating a Task — Quick Add

Tasks can be created inline using natural language. The user types into an input field and the system parses their intent:

| What you type | What it sets |
|---|---|
| `p0` | Priority = Critical |
| `p1` | Priority = High |
| `p2` | Priority = Medium |
| `p3` | Priority = Low |
| `today` | Due date = today |
| `tomorrow` | Due date = tomorrow |
| `yesterday` | Due date = yesterday |
| `2026-05-07` | Due date = May 7, 2026 |
| `monday` / `tuesday` / etc. | Due date = next occurrence of that day |
| `sp:5` | Story points = 5 |
| `sp:0.5` | Story points = 0.5 |
| `sp:13` | Story points = 13 |
| `@ahmed` | Assignee = Ahmed |

**Example**: Typing `Fix login bug p1 today sp:3 @ahmed` creates a task titled "Fix login bug" with High priority, due today, 3 story points, assigned to Ahmed.

The task is created immediately when the user hits Enter. No confirmation modal. It appears in the To Do column.

If the user types just a title with no shortcuts, the task is created with only the title. All other fields remain empty.

### 4.4 Creating a Task — Full Form

The user can also open a compact modal form for more detailed task creation. The modal layout:

- **Large input field at the top** — the title. Pre-filled if the user typed something in quick-add first.
- **Flex row of chips/buttons below the input** — each representing a metadata field. Clicking a chip opens a small dropdown to change that value. Fields shown: Priority, Due Date, Story Points, Assignee, Sprint, Checklist.
- **Deadline** — the hard cutoff date. Only settable in this modal form, never parsed from quick-add.
- **Description** — a text area for longer task descriptions.

The modal is compact with minimal white space. The input dominates the visual.

### 4.5 Task Status

Tasks move through four statuses:

1. **To Do** — not yet started
2. **In Progress** — actively being worked on
3. **Review** — work complete, awaiting review or approval
4. **Done** — completed and closed

**Auto-tracking on status changes**:

- Moving a task To Do → In Progress: logs the start time
- Moving to Done: logs the completion time and sets `completedAt`
- Time spent in each column is automatically tracked and visible on the task card

**Reopening a task**: If a task moves from Done back to another status, the `completedAt` timestamp is cleared. The task is no longer counted as completed in velocity calculations. This is logged in the audit trail.

### 4.6 Due Date vs. Deadline

- **Due date**: The target date — "I plan to finish this by Wednesday." This is the date that shows on the task card. It can be set via quick-add or the modal form.
- **Deadline**: The hard cutoff — "This MUST be done by Friday, no exceptions." Only settable in the modal form. When a task passes its deadline, the system shows a persistent warning.

### 4.7 Checklists

Every task can have a checklist — a list of small items that need to be done as part of completing the task.

- User can add items to the checklist, reorder them, and check them off
- When an item is checked, the system records: who checked it and exactly when
- When a task moves to "Done", the user can optionally choose to auto-check all remaining items
- Checklist items and their check/uncheck history are audit-logged

### 4.8 Comments

Every task has a comment thread at the bottom. Team members can:

- Post comments
- Mention other users
- Read and reply to previous comments

Comments are separate from the activity feed. Comments are for human conversation; the activity feed shows system events.

### 4.9 Activity Feed

Every task has an activity feed — a consolidated, human-readable timeline of everything that happened to the task:

```
Today
  Ahmed moved this to Review                             10:15
  Seif assigned this to Ahmed and started work           09:01
  Seif created this task as High priority                08:45
```

The activity feed groups multiple underlying changes into meaningful events. One line in the feed might represent several individual changes. It is designed for quick scanning, not forensic analysis.

### 4.10 Audit Trail

Behind the scenes, every single change to a task is logged with:

- What entity changed (task, sprint, project, workspace, file)
- What action happened (created, updated, deleted, status changed)
- Which field changed
- The old value and new value
- Who made the change
- When it happened

This is the raw data layer. The activity feed is the friendly presentation of this data.

---

## 5. Sprints

### 5.1 Sprint Creation

To create a sprint, the user sets:

- **Name** — e.g., "Sprint 4: May 12-25"
- **Start date** — when the sprint begins
- **End date** — when the sprint ends

Duration is fully flexible. The user can create a 5-day sprint, a 10-day sprint, a 14-day sprint — any length.

### 5.2 Sprint Board

The Sprint Board is a horizontal Kanban-style board where each column is a sprint:

```
Sprint 1           Sprint 2           Sprint 3           Backlog
(May 1-14)        (May 15-28)        (May 29-Jun 11)     (Unassigned)
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│ Task A   │      │ Task D   │      │ Task G   │      │ Task J   │
│ @ahmed   │      │ @fatima  │      │ @seif    │      │          │
│ Due: 5/10│      │ Due: 5/20│      │ Due: 6/5 │      │          │
│ P1       │      │ P2       │      │ P1       │      │          │
│ In Prog  │      │ To Do    │      │ To Do    │      │          │
│          │      │          │      │          │      │          │
│ Task B   │      │ Task E   │      │ Task H   │      │ Task K   │
│          │      │          │      │          │      │          │
│ Task C   │      │ Task F   │      │          │      │          │
└──────────┘      └──────────┘      └──────────┘      └──────────┘
```

Each task card inside a sprint column shows: title, assignee, due date, priority, and status badge.

Tasks in the Backlog column have no sprint assigned.

### 5.3 Moving Tasks Between Sprints

Tasks can be moved between sprints by dragging and dropping:

- Grab a task card from Sprint 2, drag it to Sprint 3, drop it
- The task's sprint assignment changes. Its status is preserved — if it was "In Progress" in Sprint 2, it stays "In Progress" in Sprint 3
- Every move is audit-logged

### 5.4 Sprint Flags

When work is planned before the sprint starts, tasks added to the sprint have no flag — they were planned.

When work is added during an active sprint (tasks that come up unexpectedly), the task gets a **sprint flag** — a text label explaining why it was added:

- `"unscheduled"` — new work that came up mid-sprint
- `"pulled_forward"` — work moved from a future sprint to the current one
- Any other custom string the PM wants to use

The flag is a flexible text field. The PM can type anything. This allows the system to evolve without constraints.

### 5.5 Sprint Status

A sprint goes through three states:

- **Planned** — created but not yet started
- **Active** — currently in progress (current date is between start and end)
- **Completed** — end date has passed

### 5.6 Sprint Locking

When a sprint ends (passes its end date):

- The sprint's status changes to "Completed"
- The velocity numbers for that sprint are frozen as a historical snapshot
- No new tasks can be added to the sprint
- Completed sprint data is available for retrospective viewing

---

## 6. Velocity

### 6.1 How Velocity Works

Velocity measures how much work actually gets done, not just what was planned.

**The core idea**: Velocity counts story points for tasks completed **during a time window**, regardless of which sprint owns the task.

**Example**:

- Sprint 2 runs May 12–25
- On May 20, a task from Sprint 3 gets completed
- Sprint 2's velocity counts those points — because the work happened during Sprint 2's dates

This gives a truer picture of team throughput. It also means Sprint 3 has less pending work — a useful signal.

### 6.2 Velocity Metrics

For any time window, the system calculates:

- **Planned points**: Tasks that were assigned to this sprint at the start (flag = null)
- **Completed points**: Tasks completed during the time window (any sprint)
- **Over-velocity**: `completed / planned`. Can be above 1.0 if more work was done than planned
- **Flagged tasks list**: All tasks completed during this window that had a sprint flag, with their flag text and story points

### 6.3 Velocity Views

| View | Time Window | Use Case |
|---|---|---|
| **Live** | Sprint start → now | Active sprint tracking. Updates in real time as tasks get completed |
| **Snapshot** | Sprint start → sprint end | Historical sprint retrospective. Shows what actually happened during that sprint |
| **Custom range** | Any start → any end | "How much did we ship in Q1?" or "What was our velocity in March?" |

All three modes use the same formula. Only the date window changes.

### 6.4 Cross-Project Velocity (Workspace Level)

Within a workspace, the Velocity page aggregates story points across all projects:

- "In the Dev Team workspace, across all 3 projects, we completed 87 story points this sprint"
- User can filter by individual projects within the workspace
- User can select time range: live sprint, historical sprint, or custom dates

### 6.5 Cross-Workspace Velocity (Global)

The global Velocity page aggregates across all workspaces:

- "Across my day job and freelance work, I completed 52 story points this week"
- User can filter by individual workspaces
- User can select time range

### 6.6 Employee Velocity

On the employee page, velocity is scoped to one person:

- Completed points over time for that employee
- Employee's contribution to each sprint they participated in
- Filterable by project and workspace

---

## 7. Capacity Planning

### 7.1 Per-Employee Capacity

Each employee has a capacity for each sprint — how many hours they can realistically work.

Capacity is set per sprint, per employee. This accounts for:

- Vacations (e.g., "Ahmed is off Monday-Tuesday = 24h available instead of 40h")
- Part-time schedules (e.g., "Fatima works 20h/week")
- Any other exceptions the PM needs to note

The PM sets the capacity hours and can add a text note explaining the adjustment.

### 7.2 Capacity vs. Assignment

For each sprint, the system compares:

- **Estimated hours** across all tasks assigned to the employee in this sprint
- **Capacity hours** set by the PM

If assigned hours exceed capacity, the system shows a warning:

```
Seif: 8 tasks, 34 SP, 48 estimated hours → Capacity: 40h → ⚠️ 120% overloaded
```

This warning is visible before the sprint even starts, allowing the PM to rebalance work.

### 7.3 Capacity View Location

Capacity planning lives as a sub-tab within the Sprint Board:

```
[Sprint Board]
  [ Board ]  [ Capacity ]

  Sprint: [Sprint 4 (May 12-25) ▼]

  Employee     Tasks    Est. Hours    Capacity    Status
  ─────────────────────────────────────────────────────
  Ahmed        6        32h           36h          ✅
  Fatima       4        22h           40h          ✅
  Seif         8        48h           32h          ⚠️ 150%
```

---

## 8. Forecasting

### 8.1 Backlog Projection

Based on historical velocity and current backlog size, the system projects how many sprints it will take to complete all remaining work:

- Current backlog: 120 story points
- Average team velocity: 28 points per sprint
- Projection: ~5 sprints to clear the backlog

The PM can choose which historical data to base the average on (last 3 sprints, last 6 months, all time).

### 8.2 Date-Based Projection (Future)

Not in v1. Once sprint count projection is stable, the system can map to calendar dates: "Estimated completion: July 14, 2026."

---

## 9. Timesheet

### 9.1 Global Timer

A universal timer sits in the top bar. It works as follows:

- **Manual mode**: User clicks "Start" to begin tracking. Timer runs. User clicks "Stop" to end the session.
- **Auto-start**: When the user moves any task to "In Progress" and the timer is not already running, the timer starts automatically.
- **Auto-stop**: When there are no tasks in "In Progress" (the column is empty), the timer stops automatically.
- **Manual override**: User can always start or stop the timer manually regardless of automation.

### 9.2 Task-Time Association

When the timer runs during a work session:

- If one task is In Progress: the entire session time is attributed to that task
- If multiple tasks are In Progress: time is split across them
- Status changes (Review, Done) during a session re-assign time to the newly active task

### 9.3 Task Timer

Beyond the global timer, each task has its own implicit timer. When a task is moved to "In Progress", the system records the start time. When moved out, it records the end time. The accumulated time across all sessions for that task becomes its actual hours.

### 9.4 Estimated vs. Actual Hours

Each task has two hour-related fields:

- **Estimated hours**: Set by the PM when creating or planning the task. "I think this will take 4 hours."
- **Actual hours**: Computed from the timesheet. Sum of all session durations logged against this task. Never manually entered.

On the employee page and task detail, the system shows estimated vs. actual for each task and accuracy percentage over time:

```
Task: Fix login bug
  Estimated: 4h   Actual: 7h   (+75% over estimate)

Employee: Ahmed (this sprint)
  Estimated: 32h   Actual: 38h   Accuracy: 84%
```

---

## 10. Files & Documents

### 10.1 Markdown Files

Users can create, edit, and delete markdown files. The editing experience:

- **Editor**: Raw markdown editor where the user types markdown syntax directly
- **Preview**: A toggle to switch from editor view to rendered preview
- No WYSIWYG in v1 — raw markdown only

### 10.2 Organization

Files are organized using:

- **Nested folders**: The user can create folders and subfolders. Files live inside folders. This gives a familiar file system structure.
- **Tags**: Each file can have one or more tags (e.g., `#specs`, `#meeting-notes`, `#onboarding`). Tags are cross-cutting — a file in any folder can have any tags. Users can filter files by tag.

A file belongs to exactly one folder, but can have many tags.

### 10.3 Scoping

Files and folders are scoped to one of three levels:

- **Company**: Visible to everyone in the company, across all workspaces. For things like "Coding standards" or "Company onboarding guide."
- **Workspace**: Visible to everyone in that workspace. For things like "Dev team sprint planning template."
- **Project**: Belongs to a specific project. For things like "API spec notes" or "Design decisions for this feature."

### 10.4 Inherited Visibility

A file scoped to a project is also visible from the parent workspace level. The user can browse all files across all projects when viewing the workspace's file list.

---

## 11. Search

### 11.1 Quick Search

`Cmd+K` opens a global search palette. The user starts typing and results appear instantly across:

- Tasks (by title)
- Projects (by name)
- Files (by name and content)

Search is self-scoped — it only searches across workspaces and projects the user has access to.

### 11.2 Search Behavior

- Results update as the user types (no need to press Enter)
- Tasks, projects, and files are visually distinguished in the results
- Clicking a result navigates directly to that item

---

## 12. Notifications

### 12.1 In-App Notifications

A bell icon in the top bar shows unread notification count. Clicking opens a dropdown list of recent notifications.

### 12.2 Notification Types

Users receive notifications for:

- **Assignment**: Someone assigns you a task
- **Comment**: Someone comments on a task you're involved with
- **Mention**: Someone mentions you in a comment
- **Deadline**: A task assigned to you is approaching or has passed its deadline

### 12.3 Notification Actions

- Clicking a notification navigates to the relevant task or page
- Individual notifications can be marked as read
- A "Mark all as read" button clears all notifications
- Notifications persist until marked as read

---

## 13. Employee Pages

### 13.1 Access

Employee pages are visible only to PMs and admins. Regular members cannot see other employees' detail pages (this is enforced later when role management is added in a future version).

### 13.2 Page Content

An employee page shows:

**Velocity summary**
- Story points completed over a selectable time range
- Comparison with planned points
- Trend over multiple sprints

**Current tasks**
- All tasks currently assigned to this employee
- Filterable by: project, workspace, status
- Shows task title, status, priority, due date, project

**Sprint contributions**
- Every sprint the employee contributed to
- Points completed per sprint
- Estimated vs. actual hours for each sprint
- Accuracy percentage

**Estimated vs. Actual accuracy**
- Across all tasks: "Ahmed estimates are 84% accurate on average"
- Shows whether the employee consistently over or under estimates

### 13.3 Filters on Employee Page

The employee's task list can be filtered by:

- **By project**: Show tasks from one specific project
- **By workspace**: Show tasks from one specific workspace
- **By status**: Show only In Progress, or only Review, etc.

---

## 14. Privacy Design

### 14.1 Workspace Names Hidden

Workspace and company names never appear in the sidebar. The sidebar only shows generic labels: Home, Velocity, Projects. This ensures sensitive information (what companies the user works with, client names, internal team names) is never visible during screen sharing or in-person meetings.

### 14.2 Where Names Do Appear

- **Top bar filter dropdown**: This is small, compact, and the user controls when it's open. Only visible when deliberately clicked.
- **Inside specific views**: Project pages, task cards, file browser — these are context-specific. The user knows they're viewing sensitive data when inside these views.

The goal: the "at rest" state of the interface (sidebar + top bar when nothing is expanded) reveals nothing sensitive.

---

## 15. Future Features (Deferred)

These features are intentionally left out of v1 and will be added later:

- **MCP server**: An API that AI agents (Claude, ChatGPT) can use to manage projects, tasks, and sprints. Requires the core product to be stable first.
- **Role management**: Fine-grained permissions (admin, PM, member). Everyone is currently a full-access member.
- **Saved filter presets**: Named filter combinations for quick workspace/project toggling.
- **Subtasks**: Nested parent-child task relationships. Checklists cover most of this need in v1.
- **Email notifications**: Currently in-app only.
- **Mobile app**: Responsive web layout covers v1 needs.
- **Real-time updates (WebSocket)**: V1 uses manual refresh or polling.
- **Burn-down charts**: Numeric velocity + capacity planning covers v1 visualization needs.
- **Rich text / WYSIWYG editing**: Raw markdown only in v1.
