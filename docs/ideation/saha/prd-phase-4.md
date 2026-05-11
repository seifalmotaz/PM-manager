# PRD: Saha - Phase 4

**Contract**: ./contract.md
**Phase**: 4 of 4
**Focus**: Velocity engine, three view modes, cross-project/workspace velocity pages, and capacity planning

## Phase Overview

Phase 4 delivers the analytical engine that distinguishes Saha from a simple task tracker. This is the phase where Saha becomes a real PM tool. The velocity engine computes story points by time window (when work was completed) rather than by task ownership (which sprint the task belongs to). Capacity planning warns PMs before sprints start when employees are overloaded.

This phase delivers: the velocity computation engine (same formula, three view modes: Live, Snapshot, Custom Range), a workspace-level velocity page showing cross-project aggregation, a global velocity page showing cross-workspace aggregation, and the Capacity sub-tab within the Sprint Board where PMs set per-employee capacity hours per sprint and get overload warnings.

After this phase, Saha v1 is complete — a PM can plan sprints, track velocity, and manage capacity across multiple work identities.

## User Stories

1. As a PM, I want to see velocity computed based on when work actually shipped during a sprint's dates so that I get a true picture of team throughput, not just what was planned
2. As a PM, I want to view velocity for a completed sprint as a historical snapshot so that I can do retrospectives without data changing
3. As a PM, I want to view velocity across all projects in my workspace so that I can see the big picture
4. As a freelancer with a day job, I want to view velocity across all my workspaces combined so that I can see my total output
5. As a PM, I want to set each employee's capacity per sprint and get warned when they're overloaded so that I can rebalance work before the sprint starts

## Functional Requirements

### Velocity Engine

- **FR-4.1**: Velocity is computed on every read — never stored as static data
- **FR-4.2**: Completed points = sum of storyPoints for all tasks where `completedAt` falls between the time window's start and end, regardless of which sprint owns the task
- **FR-4.3**: Planned points = sum of storyPoints for tasks assigned to the sprint where sprintFlag is null (planned before sprint start)
- **FR-4.4**: Over-velocity = completedPoints / plannedPoints (can be above 1.0)
- **FR-4.5**: Flagged tasks list = all tasks in the sprint with non-null sprintFlag, shown with their flag text and story points
- **FR-4.6**: Velocity formula is identical across all three view modes — only the date window changes

### Velocity — Live Mode

- **FR-4.7**: For an active sprint, shows completed points from sprint start → now
- **FR-4.8**: Updates in real time as tasks get marked Done during the sprint window
- **FR-4.9**: Shows: planned points, completed points, over-velocity ratio, flagged tasks contributing to over-velocity
- **FR-4.10**: If a task from a future sprint gets completed now, it counts toward the current sprint's completed points

### Velocity — Snapshot Mode

- **FR-4.11**: For a completed (locked) sprint, shows completed points from sprint start → sprint end
- **FR-4.12**: Data is frozen — completed points for a sprint's snapshot never changes
- **FR-4.13**: Accessible from the sprint detail or the velocity page by selecting a completed sprint

### Velocity — Custom Range Mode

- **FR-4.14**: User selects any start and end date
- **FR-4.15**: Shows completed points during that window
- **FR-4.16**: Can be filtered by workspace, project, or employee
- **FR-4.17**: Use case: "How many points did we complete in Q1?" or "What was the velocity in March?"

### Workspace Velocity Page

- **FR-4.18**: Each workspace has a Velocity page showing cross-project aggregation
- **FR-4.19**: Shows all projects in the workspace with their completed points for the selected time window
- **FR-4.20**: User can filter which projects contribute to the aggregate
- **FR-4.21**: User can switch between Live (current sprint), Snapshot (select a completed sprint), or Custom Range

### Global Velocity Page

- **FR-4.22**: Global Velocity page aggregates across all workspaces
- **FR-4.23**: Shows all workspaces with their completed points for the selected time window
- **FR-4.24**: User can filter which workspaces contribute to the aggregate
- **FR-4.25**: Same three view modes (Live, Snapshot, Custom Range)
- **FR-4.26**: Navigation: sidebar "Velocity" item points to this global page

### Capacity Planning

- **FR-4.27**: Capacity sub-tab within Sprint Board (Board | Capacity)
- **FR-4.28**: For the selected sprint, shows a table of all workspace members
- **FR-4.29**: Each row shows: employee name, number of tasks assigned, total estimated hours (sum of estimatedHours for their tasks in this sprint), capacity hours, and status
- **FR-4.30**: PM can set capacity hours per employee per sprint (editable number input)
- **FR-4.31**: PM can add a note explaining the capacity (e.g., "vacation Mon-Tue", "part-time 20h/wk")
- **FR-4.32**: System compares assigned estimated hours vs. capacity hours
- **FR-4.33**: If assignedHours > capacityHours, shows overload warning with percentage (e.g., "⚠️ 150%")
- **FR-4.34**: Employee with assignedHours ≤ capacityHours shows "✅" status
- **FR-4.35**: Sprint selector dropdown at top of Capacity view (same sprint selector used on Board tab)

### Capacity — Calculations

- **FR-4.36**: Estimated hours per employee = sum of `estimatedHours` for all tasks assigned to that employee in the selected sprint
- **FR-4.37**: If a task has no estimatedHours, it contributes 0 to the sum (not an error)
- **FR-4.38**: Capacity hours are stored per sprint per employee in employee_capacity table
- **FR-4.39**: When no capacity is set for an employee, the status column shows "Not set" (neutral, no warning)

## Non-Functional Requirements

- **NFR-4.1**: Velocity computation completes within 100ms for a workspace with 1,000 tasks
- **NFR-4.2**: Capacity table renders within 200ms for up to 50 team members
- **NFR-4.3**: Velocity page numbers update when switching between modes or filters (perceived instant)
- **NFR-4.4**: Capacity overload calculation is O(n) where n = tasks in sprint (no N+1 queries)

## Dependencies

### Prerequisites

- Phase 3 complete (sprints, Sprint Board, sprint flags, sprint locking)
- Task model with completedAt, storyPoints, estimatedHours, sprintId, sprintFlag, assigneeId
- Sprint model with startDate, endDate, status, plannedPoints (set at lock)
- Sprint Board with Board/Capacity tab structure

### Outputs for Next Phase

- Velocity engine accessible from sprint, workspace, and global levels
- Three view modes using identical computation logic
- Capacity planning table with overload detection
- This is the final v1 phase — no further phases depend on this

## Acceptance Criteria

- [ ] Active sprint shows live velocity: planned points + completed points + ratio updated in real time
- [ ] Task from Sprint 3 completed during Sprint 2's dates → counts toward Sprint 2's completed points
- [ ] Completed sprint shows frozen snapshot — numbers never change
- [ ] Custom date range shows correct completed points for that window
- [ ] Workspace velocity page shows all projects with points aggregated
- [ ] Filtering projects on workspace velocity page updates the aggregate
- [ ] Global velocity page shows all workspaces with points aggregated
- [ ] Capacity table shows correct estimated hours per employee for the selected sprint
- [ ] PM can set capacity hours and add a note
- [ ] Employee with 48h assigned and 40h capacity shows "⚠️ 120%"
- [ ] Employee with 22h assigned and 40h capacity shows "✅"
- [ ] Employee with no capacity set shows "Not set"
- [ ] Sprint selector in Capacity tab matches Board tab (same sprint, synchronized)
- [ ] All velocity and capacity changes are audit-logged
