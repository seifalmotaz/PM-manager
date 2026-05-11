# PRD: Saha - Phase 3

**Contract**: ./contract.md
**Phase**: 3 of 4
**Focus**: Sprint management — creation, Sprint Board, drag-and-drop, sprint flags, sprint locking

## Phase Overview

Phase 3 adds the sprint layer on top of the task management built in Phase 2. Sprints transform Saha from a task tracker into a real project management tool. This phase delivers sprint creation with flexible durations, the Sprint Board (horizontal columns, one per sprint), drag-and-drop task reassignment between sprints, the sprint flag system for tracking mid-sprint additions, and sprint locking when a sprint ends.

After this phase, a PM can plan work across multiple sprints, visually see which tasks belong to which sprint, move tasks between sprints with drag-and-drop, tag tasks that came in mid-sprint with contextual reasons, and have sprints automatically lock and freeze when they end.

The Sprint Board becomes the second tab on every project page, sitting alongside the Kanban from Phase 2.

## User Stories

1. As a PM, I want to create a sprint of any length (5 days, 10 days, 2 weeks) so that I can match my team's actual working rhythm
2. As a PM, I want to see all sprints side-by-side as columns so that I can plan work across multiple sprints at a glance
3. As a PM, I want to drag a task from Sprint 2 into Sprint 3 so that I can reprioritize work visually
4. As a PM, I want to flag tasks that were added mid-sprint with a reason like "unscheduled" or "pulled_forward" so that I know why they weren't in the original plan
5. As a PM, I want sprints to auto-lock when they end so that historical data stays accurate and no one accidentally modifies a completed sprint

## Functional Requirements

### Sprint Creation & Management

- **FR-3.1**: User can create a sprint within any project
- **FR-3.2**: Sprint requires: name and start/end dates (any duration allowed — no fixed lengths)
- **FR-3.3**: User can edit sprint name, dates, and status
- **FR-3.4**: User can delete a sprint (with confirmation)
- **FR-3.5**: Sprint has three statuses: Planned (before start), Active (during), Completed (after end)
- **FR-3.6**: Sprint status transitions automatically based on current date vs. start/end dates

### Sprint Board

- **FR-3.7**: Project page Sprints tab shows horizontal Sprint Board
- **FR-3.8**: Each active and upcoming sprint appears as a column
- **FR-3.9**: A "Backlog" column shows tasks with no sprint assigned
- **FR-3.10**: Each sprint column header shows: sprint name, date range, status badge, task count
- **FR-3.11**: Tasks inside sprint columns show: title, assignee, due date, priority badge, status badge
- **FR-3.12**: Sprint Board is horizontally scrollable when more sprints than fit viewport width
- **FR-3.13**: Completed sprints are visually distinct from active/planned sprints (muted/dimmed)

### Drag-and-Drop Between Sprints

- **FR-3.14**: Tasks can be dragged from one sprint column to another
- **FR-3.15**: Dragging between sprints changes the task's sprint assignment
- **FR-3.16**: A task's status is preserved when moved between sprints — if "In Progress" in Sprint 2, stays "In Progress" in Sprint 3
- **FR-3.17**: Every sprint reassignment is audit-logged
- **FR-3.18**: Tasks dragged into the Backlog column have sprintId set to null
- **FR-3.19**: Tasks cannot be dragged into a completed (locked) sprint

### Sprint Flags

- **FR-3.20**: When a task is created or moved into an active sprint, the user can optionally set a sprint flag
- **FR-3.21**: Sprint flag is a free-text string — user can type anything (e.g., "unscheduled", "pulled_forward", "emergency")
- **FR-3.22**: A task with no sprint flag (null) = task was planned before the sprint started
- **FR-3.23**: Any non-null sprint flag means the task was not part of the original sprint plan
- **FR-3.24**: Sprint flag is visible on the task card and task modal when set
- **FR-3.25**: Sprint flag can be edited or cleared at any time
- **FR-3.26**: Sprint flag changes are audit-logged

### Sprint Locking

- **FR-3.27**: When a sprint's end date passes, the sprint auto-transitions to "Completed" status
- **FR-3.28**: Completed sprints are locked — no new tasks can be added
- **FR-3.29**: Completed sprints cannot be dragged into on the Sprint Board
- **FR-3.30**: Tasks in a completed sprint can still be viewed, opened, and have their details read
- **FR-3.31**: The sprint's planned points (sum of tasks with sprintFlag=null) is computed and stored at lock time
- **FR-3.32**: Sprint locking is audit-logged

## Non-Functional Requirements

- **NFR-3.1**: Sprint Board renders within 300ms for up to 10 sprints with 20 tasks each
- **NFR-3.2**: Drag-and-drop between sprints responds within 100ms
- **NFR-3.3**: Sprint lock check executes before any write operation (O(1) check)
- **NFR-3.4**: Sprint Board horizontal scroll works with both mouse drag and trackpad gestures

## Dependencies

### Prerequisites

- Phase 2 complete (tasks, projects, audits)
- Task model with sprintId, sprintFlag, and status fields
- Project pages with Kanban tab structure (Sprints tab slot already exists)
- Drag-and-drop infrastructure from Kanban (reusable pattern)

### Outputs for Next Phase

- Sprint model with flexible dates and status lifecycle
- Sprint Board component with drag-and-drop between sprints
- Sprint flag system for tracking planned vs. unplanned work
- Sprint locking mechanism for historical data integrity
- Planned points snapshot at lock time (input for Phase 4 velocity engine)

## Acceptance Criteria

- [ ] User can create a sprint with name + any start/end dates
- [ ] Sprint appears as a new column on the Sprint Board
- [ ] Backlog column shows tasks without a sprint assigned
- [ ] User can drag a task from Backlog into a sprint column → sprintId is set
- [ ] User can drag a task from Sprint 1 to Sprint 2 → sprint assignment changes, status preserved
- [ ] Task shows sprint flag when set (e.g., "unscheduled")
- [ ] Task with no sprint flag treated as "planned"
- [ ] User cannot drag task into a completed sprint
- [ ] Sprint auto-locks when end date passes → status becomes "Completed"
- [ ] Locked sprint tasks are viewable but not modifiable for sprint reassignment
- [ ] Sprint creation, editing, and locking all produce audit log entries
- [ ] Sprint Board is horizontally scrollable with 5+ sprints
- [ ] Completed sprints appear visually dimmed on the board
