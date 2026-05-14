# Task Management Features Audit Report

**Audit Date:** May 15, 2026  
**Audited Module:** Task Management  
**Severity Distribution:** 4 Critical, 7 High, 5 Medium, 4 Low

---

## Executive Summary

The PM-manager application has a **solid foundation for task management** with core CRUD operations, status transitions, sprint management, and time tracking. However, several critical features are missing, and some existing flows have UX issues or incomplete implementations.

---

## 1. Task Creation Flow

### Current State

**Files:**
- `/packages/web/src/lib/components/QuickAddInput.svelte` - Main quick add component
- `/packages/web/src/lib/components/QuickAddModal.svelte` - Modal wrapper
- `/packages/api/src/modules/task/task.service.ts` - Backend creation logic
- `/packages/api/src/modules/task/nlp-parser.ts` - Natural language parsing (delegates to shared)

### Existing Features

1. **Quick Add (Natural Language Input):**
   - Parses priority shortcuts (p0, p1, p2, p3)
   - Parses due date shortcuts (today, tomorrow, etc.)
   - Parses @username mentions for assignee
   - Auto-strips parsing artifacts from title

2. **Task Creation Fields Supported:**
   - projectId (required)
   - title (required, 1-500 chars)
   - priority (optional: p0, p1, p2, p3)
   - storyPoints (optional)
   - estimatedHours (optional)
   - assigneeId (optional)
   - dueDate (optional)
   - deadline (optional)
   - sprintId (optional)
   - sprintFlag (optional)
   - description (optional)

### Issues Found

| Severity | Issue | File Reference | Description |
|----------|-------|----------------|-------------|
| **Medium** | No description field in QuickAdd | `QuickAddInput.svelte` | Users cannot add descriptions during quick creation. Must open task detail afterward |
| **Medium** | No estimatedHours in QuickAdd | `QuickAddInput.svelte` | Story points can be set, but not estimated hours |
| **Low** | NLP parser location unclear | `nlp-parser.ts` | The import points to `shared/nlp-parser` but file was not found at that path |
| **Low** | No project context preservation | `QuickAddInput.svelte:71-72` | Auto-selects first project but doesn't remember recent selections |

### Missing Elements

1. **Full Task Creation Modal** - There's a QuickAddModal but no detailed creation form with all fields visible
2. **Task Templates** - No way to create tasks from predefined templates
3. **Bulk Creation** - No way to create multiple tasks at once
4. **Recurring Tasks** - No support for recurring task creation

---

## 2. Task Viewing/Listing

### Current State

**Files:**
- `/packages/web/src/routes/(app)/home/+page.svelte` - Home view with Kanban/List toggle
- `/packages/web/src/routes/(app)/project/[id]/kanban/+page.svelte` - Project Kanban view
- `/packages/web/src/routes/(app)/project/[id]/sprints/+page.svelte` - Sprints board view
- `/packages/web/src/routes/(app)/project/[id]/sprints/backlog/+page.svelte` - Backlog view
- `/packages/web/src/lib/components/KanbanBoard.svelte` - Kanban display component
- `/packages/web/src/lib/components/KanbanColumn.svelte` - Kanban column with drag-and-drop
- `/packages/web/src/lib/components/TaskCard.svelte` - Task card component
- `/packages/web/src/lib/components/SprintBoard.svelte` - Sprint board component

### Existing Features

1. **Multiple Views:**
   - Home page: Kanban and List view (List view stub only)
   - Project Kanban: Full Kanban board
   - Sprint Board: Columns organized by sprint
   - Backlog: List view of unassigned tasks

2. **Workspace Filtering** - Tasks can be filtered by workspace

3. **Status-based Columns** - todo, in_progress, review, done

### Issues Found

| Severity | Issue | File Reference | Description |
|----------|-------|----------------|-------------|
| **Critical** | Filter buttons non-functional | `home/+page.svelte:81-86` | Filter and Sort buttons exist but have no implementation |
| **Critical** | List view not implemented | `home/+page.svelte:127-131` | List view toggle shows "coming soon" placeholder |
| **Critical** | Filter buttons non-functional | `project/[id]/kanban/+page.svelte:92-99` | Same Filter/Sort buttons with no handlers |
| **High** | No search/filter by assignee | `task.service.ts:34-67` | Backend supports assigneeId filter but no UI exposes it |
| **High** | No search/filter by priority | `task.service.ts` | No priority filter in list endpoint or UI |
| **High** | No search/filter by date range | `task.service.ts` | Cannot filter by due date range |
| **Medium** | Sprint field non-interactive | `TaskDetail.svelte:287-290` | Sprint field is non-functional in task details |
| **Medium** | No sorting options | `home/+page.svelte` | No sort by priority, date, assignee, etc. |
| **Low** | Drag state not persisted | `KanbanColumn.svelte:29-35` | Drag state stored in component, resets on navigation |

### Missing Elements

1. **Advanced Filtering** - No UI for filtering by assignee, priority, due date, story points
2. **Saved Filters/Views** - No way to save filter configurations
3. **Search Within Context** - No search within current project/view
4. **Task Groups/Subtasks View** - No hierarchical view
5. **Calendar View** - No calendar-based task view
6. **Timeline/Gantt View** - No timeline visualization

---

## 3. Task Details/Edit

### Current State

**Files:**
- `/packages/web/src/lib/components/TaskDetail.svelte` - Main detail panel (right sidebar)
- `/packages/web/src/lib/stores/tasks.ts` - `selectedTask` store for global selection

### Existing Features

1. **Editable Fields:**
   - Title (inline edit)
   - Description (inline edit)
   - Assignee (dropdown)
   - Due Date (date picker)
   - Deadline (date picker)
   - Priority (dropdown p0-p3)
   - Story Points (number input)
   - Sprint (stub only - non-functional)

2. **Actions:**
   - Mark complete/incomplete
   - Delete task
   - View activity timeline
   - Comments
   - Checklist items

### Issues Found

| Severity | Issue | File Reference | Description |
|----------|-------|----------------|-------------|
| **Critical** | Sprint field non-functional | `TaskDetail.svelte:287-290` | Shows "Not in a sprint" stub, cannot change sprint from detail panel |
| **High** | No status change UI | `TaskDetail.svelte` | Can only toggle done/todo via "Mark complete" - no dropdown for in_progress or review |
| **High** | No estimatedHours field | `TaskDetail.svelte` | Field exists in schema but not in UI |
| **Medium** | No parent task indicator | `TaskDetail.svelte` | No indication if task is part of a parent/child relationship |
| **Medium** | No dependencies section | `TaskDetail.svelte` | Cannot see or manage task dependencies |
| **Low** | No keyboard shortcuts | `TaskDetail.svelte` | No hotkeys for common actions (delete, complete, etc.) |
| **Low** | No undo for delete | `TaskDetail.svelte:78-90` | Delete shows confirmation but no undo period |

### UX Problems

1. **Confusing Mark Complete** - Button only toggles between done/todo, users cannot directly set to "in_progress" or "review"
2. **Hidden Sprint Assignment** - Must use Backlog view or Sprint Board to assign sprint
3. **No Direct Status Selection** - Status change requires Kanban drag-and-drop

---

## 4. Task Status Transitions

### Current State

**Files:**
- `/packages/api/src/modules/task/task.service.ts:266-332` - `changeStatus` function
- `/packages/web/src/lib/components/KanbanColumn.svelte` - Drag-and-drop status change
- `/packages/web/src/routes/(app)/project/[id]/kanban/+page.svelte` - Status change handler

### Existing Features

1. **Status Values** - todo, in_progress, review, done

2. **Automatic Timestamps:**
   - `startedAt` set when moving to in_progress (if not already set)
   - `completedAt` set when moving to done
   - `completedAt` cleared when reopening from done

3. **Audit Logging** - Status changes logged to audit trail

4. **Drag and Drop** - Functional Kanban column drag-and-drop

### Issues Found

| Severity | Issue | File Reference | Description |
|----------|-------|----------------|-------------|
| **High** | No status workflow validation | `task.service.ts:266-332` | Any status can transition to any other status freely |
| **High** | No status transition UI in detail panel | `TaskDetail.svelte` | Can't change status from detail view |
| **Medium** | No status change restrictions | `task.service.ts` | No WIP limits, no blocked status restrictions |
| **Medium** | No status change notifications | `task.service.ts` | Team members not notified when task status changes |
| **Low** | No status history view | `ActivityTimeline.svelte` | Audit log exists but not clearly displayed in timeline |

### Missing Elements

1. **Workflow States** - No customizable workflow states (only hardcoded 4 states)
2. **WIP Limits** - No work-in-progress limits per status
3. **Status Transition Rules** - No restrictions on valid transitions
4. **Status Change Reasons** - No ability to add reason/note during transition
5. **Automated Transitions** - No auto-transitions based on conditions

---

## 5. Task Relationships

### Current State

**Database Schema:** `/packages/api/src/db/schema.ts`
- No `parentId` column for hierarchical tasks
- No dependencies/blocked_by tables
- No related tasks table

### Issues Found

| Severity | Issue | File Reference | Description |
|----------|-------|----------------|-------------|
| **Critical** | No subtasks support | `schema.ts:56-75` | Tasks table has no parent_id field |
| **Critical** | No task dependencies | `schema.ts` | No dependency tracking between tasks |
| **Critical** | No task linking | N/A | Cannot link related tasks |
| **High** | No blocking relationships | N/A | Cannot mark tasks as blocking/blocked by others |

### Missing Elements

1. **Parent/Child Tasks** - No subtask hierarchy
2. **Task Dependencies** - No "blocked by" or "blocking" relationships
3. **Related Tasks** - No ability to link similar/related tasks
4. **Cross-Project References** - No way to reference tasks across projects

---

## 6. Task Assignment

### Current State

**Files:**
- `/packages/api/src/modules/task/task.service.ts:241-249` - Assignment notification logic
- `/packages/web/src/lib/components/TaskDetail.svelte:163-198` - Assignee dropdown
- `/packages/web/src/lib/components/QuickAddInput.svelte:105-120` - @mention assignment

### Existing Features

1. **Assignee Field** - Single assignee per task
2. **@mention in Quick Add** - NLP parser recognizes @username to assign
3. **Assignment Notifications** - Assignee receives notification when assigned
4. **Unassign Option** - Can set assignee to null/Unassigned
5. **Member List Population** - Task detail fetches workspace members for assignment

### Issues Found

| Severity | Issue | File Reference | Description |
|----------|-------|----------------|-------------|
| **Medium** | No multiple assignees | `schema.ts:65` | Only one `assigneeId` allowed |
| **Medium** | No reassignment notification optimization | `task.service.ts:241-249` | Always notifies new assignee, but could skip if reassigning to same person |
| **Low** | @mention case sensitivity | `QuickAddInput.svelte:111-113` | User lookup is case-insensitive, but could be confusing |
| **Low** | No assignee suggestions in QuickAdd | `QuickAddInput.svelte` | Must type exact @username, no autocomplete |

### Missing Elements

1. **Multiple Assignees** - No support for assigning task to multiple people
2. **Co-Assignees/Reviewers** - No reviewer role assignment
3. **Assignment History** - No visible history of who was previously assigned
4. **Workload View** - No view showing task distribution across team members
5. **Assignment Suggestions** - No smart suggestions based on skills/history

---

## 7. Additional Findings

### Orphaned/Broken Data Scenarios

| Severity | Issue | File Reference | Description |
|----------|-------|----------------|-------------|
| **Medium** | Project deletion cascades correctly | `schema.ts:58` | Tasks cascade delete with project - this is correct |
| **Medium** | Sprint deletion options | `sprint.router.ts:27-29` | Delete sprint can either hard-delete tasks or unassign them - user chooses |
| **Low** | No orphan detection | N/A | No admin view to find tasks without valid project/sprint references |

### UX/Design Issues

| Severity | Issue | File Reference | Description |
|----------|-------|----------------|-------------|
| **Medium** | No keyboard navigation | KanbanColumn, TaskDetail | Cannot navigate tasks with keyboard |
| **Medium** | No undo system | Throughout | Most destructive actions lack undo |
| **Low** | Sprint field confusing | Backlog view | Sprint selector shows completed sprints which can't be assigned to |
| **Low** | No confirmation on status change | KanbanBoard | Drag-and-drop changes status immediately |

### Checklist Feature Status

**Complete** - `ChecklistBlock.svelte` is fully functional with:
- Add/complete/delete checklist items
- Progress bar visualization
- Inline editing

### Activity Timeline Status

**Complete** - `ActivityTimeline.svelte` shows:
- Status changes
- Field updates
- Task creation
- Status change history displayed via audit log

### Time Tracking Status

**Complete** - `TimeTracker.svelte` supports:
- Start/stop timer on any task
- Running timer persistence across navigation
- Task search in timer dropdown
- Manual time entry option (UI stub only)

---

## Summary of Critical Issues

1. **Non-functional UI Elements** - Filter and Sort buttons throughout the app do not work
2. **Missing Sprint Assignment UI** - The field exists in TaskDetail but is non-functional
3. **No Subtask/Dependency Support** - Tasks cannot have parent/child or blocking relationships
4. **Limited Status Transition UI** - Can only toggle done/todo from detail view, must use Kanban for full status control
5. **List View Incomplete** - Home and project list views show placeholder text

---

## Summary of High Priority Issues

1. **No Advanced Filtering** - Despite backend support for some filters, UI doesn't expose them
2. **No WIP Limits or Workflow Control** - Status transitions are unrestricted
3. **Single Assignee Only** - Cannot assign to multiple people or set reviewers
4. **No Sorting Options** - Tasks cannot be sorted by different criteria

---

## Recommendations

### Must Fix (Critical)

1. **Implement functional Filter/Sort UI** or remove non-functional buttons
2. **Add sprint assignment capability** to TaskDetail panel
3. **Implement subtask/dependency model** in database schema
4. **Add status dropdown** to TaskDetail for complete status control
5. **Complete the List view implementation**

### Should Fix (High)

1. **Expose assignee and priority filters** in UI
2. **Add WIP limits or workflow validation**
3. **Consider multiple assignee support**
4. **Add sorting options** to task lists

### Nice to Have (Medium/Low)

1. **Add keyboard shortcuts** for common actions
2. **Implement undo/redo** for destructive actions
3. **Add task templates**
4. **Add calendar/timeline views**
5. **Add bulk operations**