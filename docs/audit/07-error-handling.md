# Error Handling & Loading States Audit Report

**Audit Date:** May 15, 2026  
**Audited Module:** Error Handling, Loading States, User Feedback  
**Severity Distribution:** 4 Critical, 6 High, 5 Medium, 3 Low

---

## Executive Summary

This PM-manager application (SvelteKit frontend) has **basic error handling** but **lacks several critical UX patterns for production readiness**. The application handles loading states inconsistently and relies heavily on `console.error` without user-facing error messages. There are **no toast/notification systems, no error boundaries, and network failures are not gracefully handled**.

---

## 1. Error Handling Patterns

### Current State

**Error handling is present but minimal:**
- 50+ `try-catch` blocks found across `.svelte` files
- Errors are logged to console via `console.error()`
- Some components display inline error banners
- Form validation exists in modal components

### CRITICAL Issues

| Issue | Location | Description |
|-------|----------|-------------|
| Silent failures | Multiple | Many catch blocks only use `console.error()` without user notification |
| No toast/notification system | Global | No mechanism to display transient success/error feedback to users |
| No error boundary | Global | Unhandled errors crash the UI silently |
| Network failure handling | Global | No offline detection or network error recovery |

### HIGH Issues

| Issue | File | Line(s) | Description |
|-------|------|---------|-------------|
| `CommentInput.svelte` | `/web/src/lib/components/CommentInput.svelte` | 38-43 | Failed comment creation silently swallows error - user loses input |
| `ChecklistBlock.svelte` | Multiple | 43-45, 54-57, 72-73, 85-87 | Multiple operations (add, toggle, update, delete) fail silently |
| `QuickAddInput.svelte` | `/web/src/lib/components/QuickAddInput.svelte` | 118-120 | Assignee resolution failure is "silently ignored" |
| `auth.svelte.ts` | `/web/src/lib/stores/auth.svelte.ts` | 20-21 | Session fetch errors are silently caught without logging |
| `workspaces.ts` | `/web/src/lib/stores/workspaces.ts` | 22-24 | Workspace fetch errors only console.error, no user notification |

### Missing Elements

1. **No global error boundary** - SvelteKit's `+error.svelte` page doesn't exist
2. **No toast notification library/component** - Zero occurrences of "toast" or "notification" components
3. **No offline/network failure detection** - `window.navigator.onLine` or similar not used
4. **No retry mechanisms** for failed operations

---

## 2. Loading States

### Current State

**Loading state handling is inconsistent:**
- Some components have `loading`/`isLoading` state
- Some use skeleton loaders
- Some just show text ("Loading...")
- Some have no loading state at all

### Components WITH Loading States

| Component | Pattern | Quality |
|-----------|---------|---------|
| `CapacityTable.svelte` | `isLoading` with text | Medium |
| `TimeTracker.svelte` | `isLoadingTasks` with text | Medium |
| `CommandPalette.svelte` | `loading` with spinner | Good |
| `ActivityTimeline.svelte` | `loading` with text | Medium |
| `ChecklistBlock.svelte` | `loading` with text | Medium |
| `CommentList.svelte` | `loading` with skeleton | Good |
| `NotificationBell.svelte` | `loading` with skeleton | Good |
| `ForecastView.svelte` | `loading` state | Medium |
| `VelocityView.svelte` | `isLoading` with spinner | Good |
| `KanbanBoard` (project page) | `isLoading` with spinner | Good |
| `ProjectsPage` | `isLoading` with spinner | Good |
| `HomePage` | `$isLoading` store with spinner | Good |
| `ProjectLayout` | `isLoading` with text | Medium |

### Components WITHOUT Loading States

| Component | Missing Pattern |
|-----------|-----------------|
| `TimeEntryForm.svelte` | No loading state during form submission |
| `SprintEditModal.svelte` | `isSubmitting` exists but no visual loading indicator |
| `SprintCreateModal.svelte` | `isSubmitting` exists but no visual loading indicator |
| `SprintDeleteDialog.svelte` | No loading state during deletion |
| `TaskDetail.svelte` | No loading during field updates |
| `CommentInput.svelte` | Uses `isSubmitting` but button shows text "Posting..." |

### Issues Found

| Severity | Issue | File | Description |
|----------|-------|------|-------------|
| **Medium** | Inconsistent UI patterns | Global | Some show spinners, some text, some skeletons |
| **Medium** | Loading during auth | `+layout.svelte` | Shows "Syncing workspace..." but auth errors not handled |
| **Medium** | No loading for task movements | `SprintBoard` | Drag-and-drop operations lack visual feedback |

---

## 3. Form Validation

### Current State

**Form validation exists in most modal forms:**
- Required field checks
- Basic input validation
- Error messages displayed inline

### Files with Validation

| File | Quality | Notes |
|------|---------|-------|
| `SprintCreateModal.svelte` | Good | Name required, dates required |
| `SprintEditModal.svelte` | Good | Name required |
| `TimeEntryForm.svelte` | Good | Hours validation, date range validation |
| `SprintDeleteDialog.svelte` | Basic | Confirmation dialog only |
| `QuickAddInput.svelte` | None | No validation - parsing errors silently ignored |
| `CommentInput.svelte` | Basic | Character count shown when > 4500 chars |

### Issues Found

| Severity | Issue | File | Description |
|----------|-------|------|-------------|
| **Low** | No character limit enforcement | `CommentInput.svelte` | Shows count at 4500 but limit is 5000, no hard cap |
| **Low** | No project validation | `QuickAddInput.svelte` | If projectId empty, operation might fail silently |
| **Low** | No async validation | All forms | No server-side validation sync for availability check |

---

## 4. Optimistic Updates

### Current State

**Very limited optimistic UI updates exist:**
- Sprint board task movement has optimistic update with rollback
- Checklist toggle has optimistic update with rollback
- Most operations wait for server response

### Files with Optimistic Updates

| File | Operation | Rollback |
|------|-----------|----------|
| `sprints/+page.svelte` | `handleSprintChange` (line 48-60) | Yes - reverts on failure |
| `ChecklistBlock.svelte` | Toggle completed state (line 50-57) | Yes - reverts on failure |

### Missing Optimistic Updates

| Component | Where Applicable |
|-----------|------------------|
| `TaskDetail.svelte` | Status changes, field updates |
| `KanbanBoard` | Task drag-and-drop status changes |
| `CommentList.svelte` | Comment deletion |
| `VelocityView` | Sprint selection |

---

## 5. Empty States

### Current State

**Empty states are generally well-handled:**
- Most list views show empty state messages
- Good UX messaging for "no data" scenarios

### Files with Empty States

| File | Empty State Message |
|------|---------------------|
| `home/+page.svelte` | "No tasks yet. Create one to get started!" |
| `projects/+page.svelte` | "No projects in this workspace" |
| `kanban/+page.svelte` | "No tasks in this project yet. Create one above!" |
| `backlog/+page.svelte` | "No tasks in the backlog." |
| `SprintColumn.svelte` | "No tasks in this sprint" |
| `KanbanColumn.svelte` | "No tasks yet" |
| `CommentList.svelte` | "No comments yet" |
| `ActivityTimeline.svelte` | "No activity recorded" |
| `NotificationBell.svelte` | "No notifications" |

---

## 6. Network Failures

### Current State

**Network failure handling is ABSENT:**
- No offline detection
- No automatic retry
- No queue for offline operations
- TRPC client has no error interceptor/middleware

### Critical Missing Features

1. **No network status hooks** - Not using `$: online = navigator.onLine` pattern
2. **No request retry logic** - All tRPC calls fail immediately on network error
3. **No offline queue** - Operations during offline are lost
4. **No error transformation** - Raw error objects shown to users

---

## 7. Error Display Patterns

### Current State

**Mixed error display approaches:**

| Pattern | Files | Notes |
|---------|-------|-------|
| Inline error message | `TimeEntryForm`, `SprintCreateModal`, `SprintEditModal` | Good for form errors |
| Error banner | `backlog/+page.svelte` | Timed banner (auto-dismisses after 5s) |
| Error state with retry | `CommentList`, `NotificationBell`, `CapacityTable`, `VelocityPage` | Best pattern |
| Console error only | Most other components | No user feedback |

### Best Pattern (CommentList.svelte)

```svelte
{:else if error}
  <div class="error-state">
    <span>{error}</span>
    <button onclick={() => { /* retry logic */ }}>Retry</button>
  </div>
```

---

## 8. Specific File Recommendations

### Pages That Need Improvement

#### `/web/src/routes/(app)/home/+page.svelte`

- Lines 25-27: Add error handling for status change
- Consider optimistic update for status changes

#### `/web/src/routes/(app)/project/[id]/kanban/+page.svelte`

- Lines 50-51: Add user-facing error message for status change failure
- Add error state variable and display

#### `/web/src/routes/(app)/project/[id]/sprints/+page.svelte`

- Lines 36-38: Only console.error - needs user-facing error handling
- Lines 48-60: Has optimistic update but no loading indicator during drag

### Components That Need Improvement

#### `/web/src/lib/components/TaskDetail.svelte`

- Lines 57-63: `updateField` function errors silently
- Lines 78-90: Deletion only uses `console.error`
- Add success/error toast after operations

#### `/web/src/lib/components/QuickAddInput.svelte`

- Line 124: Parser validation call is fire-and-forget with `.catch(() => {})`
- Lines 136-137: Task creation error only logged to console
- Needs inline error display or toast

#### `/web/src/lib/components/CommentInput.svelte`

- Lines 38-43: Failed submission keeps content but no error message
- Silent failure means user may think comment posted

#### `/web/src/lib/components/ChecklistBlock.svelte`

- Lines 43-45, 54-57, 72-73, 85-87: All operations fail silently
- At minimum, show error state in component

---

## Summary of Missing Elements

### Absolutely Missing

1. **Toast/Notification System** - No centralized way to show transient messages
2. **Global Error Boundary** - No `+error.svelte` page
3. **Network Status Monitoring** - No offline detection
4. **Error Logging Service** - Only console.error, no remote logging
5. **Error Boundary Component** - No fallback UI for rendering errors

### Inconsistently Implemented

1. **Loading states** - 3 different UI patterns (spinner, text, skeleton)
2. **Error display** - Some inline, some banners, most silent
3. **Form validation feedback** - Good in modals, absent elsewhere

---

## Recommendations

### Priority 1 (Critical)

1. **Create Toast Notification System:**
   - Add `/web/src/lib/stores/toasts.ts` with writable store
   - Create `/web/src/lib/components/Toast.svelte` component
   - Add toast container to root layout

2. **Add Global Error Handler:**
   - Create `+error.svelte` for SvelteKit error pages
   - Add tRPC error link/interceptor for network errors

3. **Implement Network Status:**
   - Add `online` store in auth or new network store
   - Show offline banner when network is unavailable
   - Queue operations for retry when back online

### Priority 2 (High)

4. **Wrap Silent Failures with User Feedback:**
   - `CommentInput`: Show inline error or toast
   - `ChecklistBlock`: Show inline error state
   - `QuickAddInput`: Show error message below input
   - `TaskDetail`: Show toast for update failures

5. **Standardize Loading Patterns:**
   - Create reusable `<LoadingSpinner />` component
   - Create `<LoadingSkeleton />` component
   - Use consistent pattern across all views

### Priority 3 (Medium)

6. **Add Optimistic Updates:**
   - Kanban task movements
   - Task status changes
   - Field updates in TaskDetail

7. **Improve Form Validation:**
   - Add async validation for unique constraints
   - Standardize error message styling
   - Add field-level validation states