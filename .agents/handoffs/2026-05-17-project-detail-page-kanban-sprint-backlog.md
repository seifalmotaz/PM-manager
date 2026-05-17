# Session Handoff: Project Detail Page — Kanban, Sprint Board & Backlog

**Date:** 2026-05-17
**Project:** /Volumes/MacExtend/Peronal/PM-manager
**Session Duration:** ~2 hours

## Current State

**Task:** Building the project detail page (`/projects/[id]`) with a kanban board supporting two views (status-based and sprint-based), plus a backlog tab.
**Phase:** Implementation complete + bug fix
**Progress:** 100% — All features built, typecheck passes, sprint creation date format bug fixed.

## What We Did

Implemented the complete project detail page following the approved plan (6 phases). Created task and sprint stores, built a new kanban board component (`ProjectBoard`) that can display either status columns (To Do / In Progress / Done) or sprint columns, wired task create/edit/delete/status-change, added sprint creation modal, built backlog view, and fixed a datetime format bug in sprint creation.

## Decisions Made

- **Create new `ProjectBoard`/`ProjectColumn`/`ProjectTaskCard` components** — Kept the old `KanbanBoard`/`KanbanColumn`/`TaskCard` untouched so the home page static demo still works.
- **Click-to-move instead of drag-and-drop** — DnD requires a library; click buttons and `<select>` dropdowns for moving tasks between statuses/sprints is the v1 approach.
- **Two board modes in one component** — `ProjectBoard` accepts a `mode: 'status' | 'sprint'` prop rather than duplicating rendering logic.
- **NLP quick-add with fallback** — `QuickAddInput` calls `trpc.task.parse.query` with a 3-second timeout; if parsing fails or is slow, submits the raw title.
- **Backlog as a tab, not a route** — Simpler navigation; matches the PRD project-view structure.
- **Date format fix: append `T00:00:00Z`** — Backend `z.string().datetime()` requires full ISO datetime; `<input type="date">` produces `YYYY-MM-DD`.

## Code Changes

### Files Created (11)

| File | Purpose |
|---|---|
| `packages/web/src/lib/stores/task.svelte.ts` | TaskStore: load, create, update, delete, changeStatus with 10s timeout guards and decimal→number coercion |
| `packages/web/src/lib/stores/sprint.svelte.ts` | SprintStore: load, create, update, complete, delete with active/planned/completed getters |
| `packages/web/src/routes/projects/[id]/+page.svelte` | Project detail route: auth guard, data loading, tabs, board mode toggle, modals |
| `packages/web/src/lib/components/projects/ProjectHeader.svelte` | Header: project name + color dot, Board/Backlog tabs, Status/Sprint toggle, New Sprint button |
| `packages/web/src/lib/components/board/ProjectBoard.svelte` | Kanban board with status or sprint columns + Backlog |
| `packages/web/src/lib/components/board/ProjectColumn.svelte` | Single column: task list, quick-add input, move controls |
| `packages/web/src/lib/components/tasks/ProjectTaskCard.svelte` | Task card: title, priority badge, due date, status/sprint move buttons |
| `packages/web/src/lib/components/tasks/TaskDetailModal.svelte` | Full task edit modal: title, status chips, metadata chips, deadline, description, delete |
| `packages/web/src/lib/components/board/QuickAddInput.svelte` | Inline task creation with NLP parsing (`p0`, `today`, `sp:3`) via `task.parse` |
| `packages/web/src/lib/components/sprints/SprintCreateModal.svelte` | Sprint creation modal: name, goal, start/end dates, validation |
| `packages/web/src/lib/components/projects/BacklogView.svelte` | Backlog tab: list of unassigned tasks with sprint assignment dropdown + create button |

### Files Modified (2)

| File | Change |
|---|---|
| `packages/web/src/lib/components/projects/ProjectCard.svelte` | Added `goto('/projects/' + project.id)` navigation; edit/delete buttons use `stopPropagation` to prevent navigation |
| `packages/web/src/routes/projects/[id]/+page.svelte` | Removed unused `.backlog-placeholder` CSS rule |

### Files Preserved (not touched)

- `packages/web/src/lib/components/board/KanbanBoard.svelte` — old static demo for home page
- `packages/web/src/lib/components/board/KanbanColumn.svelte` — old static column
- `packages/web/src/lib/components/tasks/TaskCard.svelte` — old static task card
- `packages/web/src/routes/+page.svelte` — home page (still shows static KanbanBoard)

### Bug Fix

- `SprintCreateModal.svelte` lines 65–66: changed `startDate` and `endDate` to append `T00:00:00Z` to satisfy backend `z.string().datetime()` validation.

## Open Questions

- [ ] Should `UpdateTaskInput` in `TaskDetailModal` send `null` or omit fields when clearing values? Currently sends `null` explicitly.
- [ ] Should the backlog view use `QuickAddInput` (with NLP parsing) instead of the simple input it currently has?
- [ ] Should `task.changeStatus` reload tasks after mutation to get updated `startedAt`/`completedAt` timestamps?
- [ ] Do we need pagination on the task list for projects with 100+ tasks?

## Blockers / Issues

None. All phases complete. `bun run typecheck` passes with 0 errors.

Pre-existing LSP diagnostics (not actual errors):
- `isOrgAdmin` "does not exist on type OrganizationStore" — false positive, method exists and works. `bun run typecheck` passes.
- `activeOrg` possibly `null` inside `$effect` — TypeScript can't see the `shouldLoad` guard. Runtime-safe.

## Context to Remember

### Architecture
- **Frontend:** `https://saha.localhost` (SvelteKit on Vite)
- **Backend:** `https://api.saha.localhost` (Hono + tRPC)
- **tRPC client:** `packages/web/src/lib/trpc.ts` with `credentials: 'include'` for cross-origin cookies
- **WorkOS handles org identity** — No local `organizations` table

### Svelte 5 Patterns
- **Never export `$state` directly** — use class pattern with `.svelte.ts` files
- **Never mutate state inside `$derived`** — create immutable copies with `{ ...obj, newProp }`
- **SSR-safe** — use `$derived` for reactive reads in components
- **Effects for side effects** — data loading, event listeners

### Backend APIs (already existed, no changes needed)
- `trpc.project.byId.query({ id })` → `Project`
- `trpc.task.list.query({ projectId?, sprintId?, status?, assigneeId? })` → `Task[]`
- `trpc.task.create.mutate({ projectId, title, priority?, storyPoints?, estimatedHours?, assigneeId?, dueDate?, sprintId?, description?, sprintFlag? })`
- `trpc.task.update.mutate({ id, ...fields })`
- `trpc.task.changeStatus.mutate({ id, status })`
- `trpc.task.delete.mutate({ id })`
- `trpc.task.parse.query({ input })` → NLP parsed fields
- `trpc.sprint.list.query({ projectId })` → `Sprint[]`
- `trpc.sprint.create.mutate({ projectId, name, goal?, startDate, endDate? })`
- `trpc.sprint.complete.mutate({ sprintId, unfinishedTaskAction })`

### Database Commands
```bash
cd packages/api
bun --env-file=.env run db:migrate   # Apply migration
cd packages/web
bun run typecheck                     # Check types
```

## Next Steps

1. [ ] **Test the full flow** — Navigate to `/projects`, click a project, verify detail page loads with real tasks
2. [ ] **Test sprint creation** — Create a sprint, verify it appears in sprint mode, verify date format fix works
3. [ ] **Test task moves** — Move tasks between status columns and sprint columns
4. [ ] **Test backlog** — Assign backlog tasks to sprints, create tasks from backlog tab
5. [ ] **Test task modal** — Open task detail, edit fields, change status, delete
6. [ ] **Remove temporary console.logs** — If any debug logging remains in `+page.svelte` or components
7. [ ] **Consider drag-and-drop** — Add a DnD library (e.g., `@dnd-kit`) for task movement (deferred)
8. [ ] **Sprint completion UI** — Add "Complete Sprint" button and confirmation dialog (backend exists)
9. [ ] **Capacity view** — Add capacity planning sub-tab within sprint board (backend exists)

## Files to Review on Resume

- `packages/web/src/routes/projects/[id]/+page.svelte` — Main orchestrator page, all handlers, auth guard
- `packages/web/src/lib/stores/task.svelte.ts` — TaskStore with `normalizeTask` decimal coercion
- `packages/web/src/lib/stores/sprint.svelte.ts` — SprintStore with `activeSprint`/`plannedSprints`/`completedSprints` getters
- `packages/web/src/lib/components/board/ProjectBoard.svelte` — Column derivation logic (status vs sprint mode)
- `packages/web/src/lib/components/tasks/TaskDetailModal.svelte` — Form state, dirty tracking, chip editors
- `packages/web/src/lib/components/sprints/SprintCreateModal.svelte` — Date format fix (lines 65–66)

## Quick Debug Commands

```bash
# Typecheck all
cd packages/web && bun run typecheck

# Check if tasks exist in DB
SELECT id, title, status, sprint_id, project_id FROM tasks;

# Check sprints
SELECT id, name, status, start_date, end_date, project_id FROM sprints;

# Check projects
SELECT id, name, workspace_id FROM projects;
```
