# PRD: Saha - Phase 2

**Contract**: ./contract.md
**Phase**: 2 of 4
**Focus**: Workspaces, projects, tasks with NLP quick-add, Kanban board, audit logging

## Phase Overview

Phase 2 brings Saha to life — the user can now create and manage their work. This phase delivers the workspace system (personal + company), project creation within workspaces, the full task management system with natural language quick-add parsing, the Kanban board with four columns and drag-and-drop status transitions, and the comprehensive audit logging system that records every mutation.

This phase transforms the empty shell from Phase 1 into a functional PM tool. After Phase 2, a user can work across multiple workspaces, create projects, spin up tasks instantly with the NLP parser, move tasks through their lifecycle on the Kanban board, and have a complete record of every change.

The top-bar workspace filter becomes operational, allowing the user to toggle which workspaces appear in the Home kanban view.

## User Stories

1. As a freelancer, I want to toggle between my personal workspace and client workspaces so that I can see only relevant tasks without switching accounts
2. As a PM, I want to create projects within a workspace so that I can organize work by deliverable
3. As a busy worker, I want to type "Fix bug p1 tomorrow sp:3 @ahmed" and have a task created instantly so that I capture work at the speed of thought
4. As a PM, I want to drag tasks across columns (To Do → In Progress → Review → Done) so that I can track progress visually
5. As a PM, I want to know how long a task has been stuck in Review so that I can spot bottlenecks
6. As a PM, I want to see a warning when tasks miss their deadline so that nothing slips through

## Functional Requirements

### Workspaces

- **FR-2.1**: User can view all workspaces they belong to (personal + company workspaces)
- **FR-2.2**: User can join a company workspace via WorkOS organization membership (existing WorkOS org membership = workspace membership)
- **FR-2.3**: Top-bar workspace filter dropdown shows all workspaces with checkboxes
- **FR-2.4**: Selecting workspaces in the dropdown filters which tasks appear in Home kanban
- **FR-2.5**: Workspace filter resets to "All" each session (new login = all workspaces visible)
- **FR-2.6**: Each workspace shows its name, type (personal/company), and member count in listing

### Projects

- **FR-2.7**: User can create a project within any workspace they belong to
- **FR-2.8**: Project has name, optional description, optional color (hex)
- **FR-2.9**: User can view all projects grouped by workspace
- **FR-2.10**: Each project has its own Kanban and Sprint pages (Sprint page added in Phase 3)
- **FR-2.11**: Project detail page has two tabs: Kanban, Sprints (Sprints tab non-functional until Phase 3)

### Tasks — Quick-Add NLP Parser

- **FR-2.12**: Input field on Home page accepts natural language task creation
- **FR-2.13**: Parser extracts priority: `p0` (critical), `p1` (high), `p2` (medium), `p3` (low)
- **FR-2.14**: Parser extracts due date: `today`, `tomorrow`, `yesterday`, `YYYY-MM-DD`, day names (`monday`, `friday`, etc — next occurrence)
- **FR-2.15**: Parser extracts story points: `sp:N` or `sp:N.M` (e.g., `sp:5`, `sp:0.5`, `sp:13`)
- **FR-2.16**: Parser extracts assignee: `@username` matches existing workspace members
- **FR-2.17**: Parser strips matched patterns from the title — remainder becomes the task title
- **FR-2.18**: Hitting Enter creates the task immediately with all parsed fields set
- **FR-2.19**: Task with no shortcuts (just a title) is created immediately with empty metadata
- **FR-2.20**: Created task appears in the To Do column

### Tasks — Full Form Modal

- **FR-2.21**: Opening the task modal shows a compact form: large title input at top
- **FR-2.22**: Below the title: flex row of metadata chips/buttons (Priority, Due Date, Story Points, Assignee, Sprint, Deadline)
- **FR-2.23**: Clicking a metadata chip opens a small dropdown to change that value
- **FR-2.24**: Deadline field is only settable in the modal (not parsed from quick-add)
- **FR-2.25**: Description textarea available in the modal
- **FR-2.26**: Modal has minimal white space — input dominates the layout

### Tasks — Status Flow & Dwell Time

- **FR-2.27**: Tasks move through four statuses: To Do, In Progress, Review, Done
- **FR-2.28**: Every status transition is auto-timestamped (startedAt for In Progress, completedAt for Done)
- **FR-2.29**: Kanban card shows how long the task has been in its current column (dwell time)
- **FR-2.30**: Moving a task from Done back to another status clears completedAt
- **FR-2.31**: Task reopening is audit-logged

### Tasks — Due Date & Deadline

- **FR-2.32**: Due date (target) appears on the task card
- **FR-2.33**: Deadline (hard cutoff) — when passed, task card gets red visual treatment
- **FR-2.34**: Persistent badge in top bar shows count of overdue tasks (past deadline)

### Kanban Board

- **FR-2.35**: Home page shows Kanban board with 4 columns: To Do, In Progress, Review, Done
- **FR-2.36**: Task cards display: title, due date, priority badge (P0=red, P1=orange, P2=yellow, P3=gray), project label, column dwell time
- **FR-2.37**: Tasks are draggable between columns (drag and drop triggers status transition)
- **FR-2.38**: Kanban board filters tasks by selected workspaces/projects from top-bar dropdown
- **FR-2.39**: Project view has its own Kanban tab showing only that project's tasks

### Audit Logs

- **FR-2.40**: Every mutation (create, update, delete, status change) on any entity is logged
- **FR-2.41**: Each log entry records: entity type, entity ID, action, field changed, old value, new value, user who made the change, timestamp
- **FR-2.42**: Audit logs are append-only — never modified or deleted

## Non-Functional Requirements

- **NFR-2.1**: Quick-add parsing completes in under 50ms (feels instant)
- **NFR-2.2**: Kanban board renders within 200ms for up to 100 tasks
- **NFR-2.3**: Drag-and-drop transitions respond within 100ms
- **NFR-2.4**: Audit log writes are non-blocking (don't slow down the primary mutation)
- **NFR-2.5**: Workspace filter toggle updates the kanban within 300ms

## Dependencies

### Prerequisites

- Phase 1 complete (auth, database, layout shell, monorepo)
- WorkOS configured and accepting OAuth callbacks

### Outputs for Next Phase

- Workspace model with member management
- Project model within workspaces
- Full task system with NLP parser, status flow, dwell time, deadlines
- Kanban board component (reusable — same component reused in Project view)
- Audit logging infrastructure (used by all subsequent phases)
- Top-bar workspace filter operational

## Acceptance Criteria

- [ ] User can see all workspaces (personal + company) in top-bar filter dropdown
- [ ] Checking/unchecking workspaces in dropdown filters the Home kanban
- [ ] User can create a project in any workspace
- [ ] Typing `"Test task p1 tomorrow sp:3"` creates task with those fields populated
- [ ] Typing `"Quick task"` creates task with title only
- [ ] Task appears immediately in To Do column after creation
- [ ] User can drag a task from To Do to In Progress → dwell time counter starts
- [ ] User can drag from In Progress → Review → Done
- [ ] Task card shows correct dwell time for its current column
- [ ] Task card shows red treatment when past deadline
- [ ] Top bar shows "N overdue" badge when tasks are past deadline
- [ ] Opening a task shows compact modal with metadata chips
- [ ] Changing values via chips updates the task immediately
- [ ] Every mutation creates an audit log entry with correct data
- [ ] Project view shows Kanban tab with only that project's tasks
