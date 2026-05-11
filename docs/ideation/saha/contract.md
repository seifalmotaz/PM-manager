# Saha Contract

**Created**: 2026-05-10
**Confidence Score**: 95/100
**Status**: Approved
**Supersedes**: None

## Problem Statement

A new project manager works a day job and freelances after hours. They need a project management tool that handles real PM workflows — velocity tracking, sprint planning, capacity management — without Jira's enterprise complexity or Trello's shallowness.

Existing tools force separate accounts for each work identity. Trello is a kanban-shaped to-do list with no velocity, no sprints, no capacity. Jira buries useful features under 15 years of enterprise configuration — it's a tool for Jira admins, not for PMs. There is nothing in between designed for someone learning the PM craft who needs real capabilities without a full-time administrator.

The user tried both. They're stuck choosing between a toy and a cathedral. They need a workshop.

## Goals

1. **Manage work across multiple identities** — one account, personal workspace + multiple company workspaces, with a filter to toggle views
2. **Run real sprints with velocity tracking** — flexible-duration sprints, planned vs. completed points, computed by when work actually shipped, not just which sprint owns the task
3. **Plan team capacity before sprints start** — per-employee capacity hours with overload warnings, so the PM rebalances work before it becomes a problem
4. **Create tasks with zero friction** — natural language parsing in the quick-add input so tasks are created at the speed of thought

## Success Criteria

- [ ] User signs up via WorkOS, lands on Home with personal workspace auto-created
- [ ] User can create tasks via NLP quick-add (`p1 today sp:3 @ahmed`), task appears immediately in To Do
- [ ] User can drag tasks across Kanban columns (To Do → In Progress → Review → Done), dwell time tracked per column
- [ ] User can create a sprint with any start/end dates, assign tasks to it, see them on the Sprint Board
- [ ] User can drag tasks between sprint columns on the Sprint Board
- [ ] Sprint velocity shows planned points (tasks assigned at sprint start) and completed points (tasks completed during sprint window, regardless of ownership)
- [ ] Velocity can be viewed as live, snapshot, or custom date range
- [ ] User can set per-employee capacity hours per sprint, system warns when assigned hours exceed capacity
- [ ] Workspace names never appear in sidebar; only generic labels (Home, Velocity, Projects)
- [ ] User can join a company workspace via WorkOS invitation

## Scope Boundaries

### In Scope

- Single-user account with WorkOS authentication
- Auto-created personal workspace on first signup
- Multiple company workspaces via WorkOS organization membership
- Multi-select workspace filter in top bar (session-reset, defaults to All)
- Privacy-safe sidebar (Home, Velocity, Projects — no workspace names)
- Task CRUD with natural language quick-add parser (p0-p3, dates, sp:N, @user)
- Task status flow: To Do, In Progress, Review, Done
- Column dwell time tracking (auto-timestamped on status transitions)
- Due date (target) and deadline (hard cutoff) per task
- Deadline warning badge in top bar ("2 overdue")
- Compact task modal form with flex-row metadata chips
- Sprint creation with flexible start/end dates
- Sprint Board (horizontal columns, one per sprint + Backlog)
- Drag-and-drop task reassignment between sprint columns
- Sprint flags: null for planned tasks, free-text string for mid-sprint additions
- Sprint locking on end date (velocity frozen, no new tasks)
- Velocity computation: live, snapshot, custom date range — all using same time-window formula
- Cross-project velocity (workspace-level page)
- Cross-workspace velocity (global page)
- Per-employee per-sprint capacity hours with overload warnings
- Capacity sub-tab within Sprint Board
- Full audit logs on every mutation (entity, action, field, old/new values, user, timestamp)

### Out of Scope

- **Comments on tasks** — communication happens outside the tool for v1
- **Checklists within tasks** — v1 tasks are atomic; break work into separate tasks
- **Activity feed UI** — audit logs are stored but not presented as a human-readable timeline
- **Global search (Cmd+K)** — navigation via sidebar + project browsing covers v1 needs
- **In-app notifications** — no notification bell; PMs check the board directly
- **Employee detail pages** — capacity table in Sprint Board covers this v1 need
- **Timesheet / global timer** — no time tracking in v1; estimated hours only, no actual hours
- **Markdown files & documents** — no file system in v1; external docs tools cover this
- **Forecasting (backlog projection)** — velocity numbers are present, projections are v1.1
- **Role management** — all workspace members have full access
- **MCP server** — requires stable API first; post-v1 priority
- **Saved filter presets** — session-reset default is sufficient for v1
- **Email notifications** — no notification infrastructure at all
- **Mobile app** — responsive web layout only
- **Real-time updates (WebSocket)** — manual refresh sufficient
- **Subtask nesting** — flat task model

### Future Considerations

- MCP server for AI agent integration (Claude, ChatGPT)
- Comments, checklists, and activity feed on tasks
- Global search with Cmd+K
- In-app notification bell
- Employee detail pages with velocity history and filters
- Global timesheet timer with auto-start/stop
- Estimated vs. actual hours tracking
- Markdown file management with nested folders and tags
- Backlog forecasting based on historical velocity
- Saved filter presets for workspace/project views
- Role management (admin, PM, member permissions)

## Execution Plan

_Added 2026-05-10 during Phase 5 handoff._

### Dependency Graph

```
Phase 1: Foundation (Auth, DB, Layout)
  └── Phase 2: Task Management (Workspaces, Projects, Tasks, Kanban, NLP, Audit)
        └── Phase 3: Sprints (Sprint CRUD, Sprint Board, Flags, Locking)
              └── Phase 4: Velocity & Capacity (Velocity engine, 3 modes, Capacity table)
```

All phases are strictly sequential — each phase builds on the models and components of the previous one.

### Execution Steps

**Strategy**: Sequential

1. **Phase 1 — Foundation** _(blocking)_
   ```bash
   /execute-spec docs/ideation/saha/spec-phase-1.md
   ```

2. **Phase 2 — Task Management** _(blocked by Phase 1)_
   ```bash
   /execute-spec docs/ideation/saha/spec-phase-2.md
   ```

3. **Phase 3 — Sprints** _(blocked by Phase 2)_
   ```bash
   /execute-spec docs/ideation/saha/spec-phase-3.md
   ```

4. **Phase 4 — Velocity & Capacity** _(blocked by Phase 3)_
   ```bash
   /execute-spec docs/ideation/saha/spec-phase-4.md
   ```
