# Sprint Management Features Audit Report

**Audit Date:** May 15, 2026  
**Audited Module:** Sprint Management  
**Severity Distribution:** 4 Critical, 7 High, 5 Medium, 5 Low

---

## Executive Summary

The PM-manager application has a **solid foundation for sprint management** with sprint creation, task assignment, capacity planning, and basic sprint transitions. However, **critical workflow features around sprint completion are missing**, and several UX friction points impact team productivity.

---

## 1. Sprint Creation Flow

### Current State

**Files:**
- `/packages/web/src/lib/components/SprintCreateModal.svelte` (275 lines)
- `/packages/web/src/routes/(app)/project/[id]/sprints/+layout.svelte` (116 lines)
- `/packages/api/src/modules/sprint/sprint.service.ts` (lines 154-196)
- `/packages/api/src/modules/sprint/sprint.router.ts` (router endpoints)
- `/packages/api/src/modules/sprint/sprint.schema.ts` (validation schemas)

**Features:**
- Modal-based creation form with fields: name, goal (optional), start date, end date
- Access-checked via projectService
- Date validation (start < end)
- Auto-computed status based on dates (planned/active/completed)
- Audit logging for sprint creation

### Issues Found

| Severity | Issue | File Reference |
|----------|-------|----------------|
| **Medium** | No sprint goal display after creation | `SprintColumn.svelte` line 136 |
| **Low** | No default sprint name suggestion | `SprintCreateModal.svelte` line 89 |
| **Low** | No date range validation UI feedback | `SprintCreateModal.svelte` lines 47-50 |

### Missing Elements

- No sprint templates (common patterns like 2-week sprint)
- No sprint copy/duplicate feature
- No sprint naming convention enforcement

---

## 2. Sprint Planning (Task Assignment & Backlog Management)

### Current State

**Files:**
- `/packages/web/src/routes/(app)/project/[id]/sprints/backlog/+page.svelte` (314 lines)
- `/packages/web/src/lib/components/SprintBoard.svelte` (131 lines)
- `/packages/web/src/lib/components/SprintColumn.svelte` (270 lines)
- `/packages/api/src/modules/task/task.service.ts` (sprint assignment logic)

**Features:**
- Backlog view shows unassigned tasks (tasks with `sprintId: null`)
- Drag-and-drop task assignment between sprint columns
- Sprint selector dropdown in backlog view
- `sprintFlag` field for special status (e.g., "unscheduled", "pulled_forward")
- Optimistic updates for sprint assignment

### Issues Found

| Severity | Issue | File Reference |
|----------|-------|----------------|
| **High** | Tasks cannot be moved from completed sprints | `SprintColumn.svelte` lines 38-40 |
| **High** | No sprint flag management UI | `SprintTaskCard.svelte` only displays flag |
| **Medium** | No drag-and-drop visual feedback in backlog view | `backlog/+page.svelte` uses dropdown |
| **Medium** | Lost task context after sprint completion | No automatic handling |
| **Low** | No bulk task assignment | Must assign one at a time |

### Missing Elements

- No sprint planning view showing all tasks across multiple sprints
- No sprint capacity warnings during planning
- No sprint commitment tracking
- No sprint planning poker/story pointing interface

---

## 3. Sprint Execution (State Transitions)

### Current State

**Files:**
- `/packages/api/src/modules/sprint/sprint.service.ts` lines 28-109 (status transition logic)
- `/packages/api/src/modules/sprint/sprint.type.ts` line 8 (status types)

**Status Flow:**
- `planned` → `active` → `completed`
- Automatic transitions based on current date vs. sprint dates

### Issues Found

| Severity | Issue | File Reference |
|----------|-------|----------------|
| **Critical** | No manual sprint completion endpoint | `sprint.router.ts` has no complete endpoint |
| **Critical** | Lazy status refresh only | Status updates only when sprint accessed |
| **High** | No sprint abandon/cancel flow | No "cancelled" status |
| **Medium** | Notifications fire on lazy status update | `sprint.service.ts` lines 94, 104 |
| **Low** | No sprint start confirmation | Automatic on date |

### Missing Elements

- No "Complete Sprint" button anywhere in the UI
- No explicit "Start Sprint" action to confirm team readiness
- No sprint cancellation option
- No background job to update statuses

---

## 4. Capacity Planning

### Current State

**Files:**
- `/packages/api/src/modules/sprint/capacity.service.ts` (164 lines)
- `/packages/api/src/modules/sprint/capacity.router.ts` (24 lines)
- `/packages/web/src/lib/components/CapacityTable.svelte` (275 lines)
- `/packages/web/src/routes/(app)/project/[id]/sprints/+page.svelte` lines 80-92

**Features:**
- Capacity data entry per-member per-sprint
- Overload detection (estimated hours > capacity hours)
- Visual overload indicators
- Admin-only capacity editing (`adminProcedure`)

### Issues Found

| Severity | Issue | File Reference |
|----------|-------|----------------|
| **Medium** | Capacity data not visible during planning | `backlog/+page.svelte` - no capacity visibility |
| **Medium** | No capacity history/trends | Only current sprint capacity visible |
| **Low** | Admin-only editing restriction | `capacity.router.ts` line 11 |
| **Low** | Overload percentage display confusion | `CapacityTable.svelte` line 127 |

### Missing Elements

- No capacity planning view before sprint starts
- No capacity-based task recommendations
- No sprint velocity prediction based on capacity
- No time-off/vacation tracking integration

---

## 5. Sprint Completion

### Current State

- Status transitions:
  - Automatic when `now > sprint.endDate`
  - `plannedPoints` calculated and stored on completion

### Issues Found

| Severity | Issue | File Reference |
|----------|-------|----------------|
| **Critical** | No end-of-sprint workflow for unfinished tasks | `sprint.service.ts` lines 72-75 |
| **Critical** | Cannot close sprint early | No "Complete Sprint" button |
| **High** | No sprint retrospective or summary | No summary view |
| **High** | Velocity excludes flagged tasks from planned points | `sprint.service.ts` lines 43-56 |
| **Medium** | No sprint completion notification for unfinished tasks | No special handling |

---

## 6. Sprint Views (Board/Backlog/Capacity)

### Sprint Board View

**Files:**
- `/packages/web/src/lib/components/SprintBoard.svelte`
- `/packages/web/src/lib/components/SprintColumn.svelte`
- `/packages/web/src/lib/components/SprintTaskCard.svelte`

**Issues Found:**

| Severity | Issue | File Reference |
|----------|-------|----------------|
| **High** | Forecast always visible, cannot collapse initially | `+page.svelte` line 96 |
| **Medium** | No sprint goal display on board | Sprint goal field unused |
| **Medium** | No velocity/metrics display on board | No metrics shown |
| **Low** | Sprint selection not in URL | Local state, not URL param |
| **Low** | Custom drag-drop implementation | Lines 55-74 |

### Backlog View

**File:** `/packages/web/src/routes/(app)/project/[id]/sprints/backlog/+page.svelte`

**Issues Found:**

| Severity | Issue | File Reference |
|----------|-------|----------------|
| **High** | No search/filter in backlog | Large backlogs unmanageable |
| **Medium** | No bulk actions | Assign one at a time |
| **Low** | Task row clickability unclear | Lines 110-154 |

### Capacity View

**File:** `/packages/web/src/lib/components/CapacityTable.svelte`

**Issues Found:**

| Severity | Issue | File Reference |
|----------|-------|----------------|
| **Medium** | No member workload visualization | Text-only display |
| **Low** | No sprint velocity vs capacity comparison | Separate concepts |

---

## 7. Status Synchronization Issues

### Issues Found

| Severity | Issue | File Reference |
|----------|-------|----------------|
| **Critical** | Race condition in status updates | `sprint.service.ts` lines 77-84 |
| **High** | Status becomes stale without access | No background sync |
| **Medium** | Notifications delayed until access | `sprint.service.ts` lines 94, 104 |
| **Medium** | plannedPoints only set during status transition | Line 74 |

---

## Summary of Critical Issues

| Severity | Issue | Impact |
|----------|-------|--------|
| **Critical** | No manual sprint completion | Cannot finish sprint early |
| **Critical** | No end-of-sprint workflow for unfinished tasks | Tasks stuck in completed sprint |
| **Critical** | Race condition in status updates | Concurrent access issues |
| **Critical** | Status becomes stale without access | Wrong sprint status displayed |
| **High** | Tasks locked in completed sprints | Cannot move tasks after completion |
| **High** | No sprint flag management UI | Key feature inaccessible |
| **High** | No search/filter in backlog | Large backlogs unmanageable |
| **High** | Notifications delayed until access | Late notifications |

---

## Recommendations

### Critical (Must Fix)

1. **Add Manual Sprint Completion Endpoint**
   - Create `sprint.complete` mutation
   - Validate sprint is in "active" status
   - Prompt for unfinished task handling

2. **Implement Background Status Sync**
   - Add cron job or scheduled task to update sprint statuses
   - Ensure notifications fire on time

3. **Add Sprint Completion Workflow**
   - When sprint completes, show summary
   - Prompt: move unfinished tasks to backlog or next sprint?
   - Display velocity metrics

### High Priority

4. **Add Sprint Flag Management UI**
   - Add flag selector in task detail
   - Support common flags: "unscheduled", "pulled_forward", "added_mid_sprint"

5. **Improve Backlog UX**
   - Add search/filter
   - Add bulk selection and assignment
   - Show sprint capacity alongside assignment dropdown

6. **Add Sprint Metrics to Board View**
   - Display story points per sprint
   - Show progress bars
   - Include velocity trend

### Medium Priority

7. **Persist Sprint Selection in URL**
   - Use URL params for selected sprint
   - Enable sharing direct links

8. **Add Sprint Goal Display**
   - Show sprint goal in board view
   - Include in sprint selection

---

## Conclusion

Sprint management has a solid foundation but lacks critical workflow features around sprint completion. Teams cannot complete sprints early, handle unfinished tasks properly, or manage sprint flags. The status synchronization issue with lazy updates can lead to stale data and delayed notifications.