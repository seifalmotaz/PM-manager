# API Coverage vs Frontend Usage Audit Report

**Audit Date:** May 15, 2026  
**Audited Module:** Backend API vs Frontend Implementation  
**Severity Distribution:** 4 Critical, 8 High, 4 Medium, 2 Low

---

## Executive Summary

This audit examines the PM-manager application's **tRPC backend endpoints against frontend usage**. The analysis reveals several patterns: **unused endpoints, missing UI features, and incomplete CRUD operations**.

---

## Module-by-Module Analysis

### 1. Authentication Module

| Endpoint | Backend Exists | Frontend Uses | Status |
|----------|---------------|---------------|--------|
| `auth.loginUrl` | ✅ | ✅ | **ACTIVE** |
| `auth.callback` | ✅ | ✅ | **ACTIVE** |
| `auth.session` | ✅ | ✅ | **ACTIVE** |
| `auth.logout` | ✅ | ✅ | **ACTIVE** |

**Files:**
- Backend: `/packages/api/src/modules/auth/auth.router.ts`
- Frontend: `/packages/web/src/lib/stores/auth.svelte.ts`

**Verdict:** ✅ Fully covered

---

### 2. Workspace Module

| Endpoint | Backend Exists | Frontend Uses | Status |
|----------|---------------|---------------|--------|
| `workspace.list` | ✅ | ✅ | **ACTIVE** |
| `workspace.byId` | ✅ | ✅ | **ACTIVE** |
| `workspace.create` | ✅ | ❌ | **UNUSED** |
| `workspace.members` | ✅ | ✅ | **ACTIVE** |
| `workspace.removeMember` | ✅ (admin) | ❌ | **MISSING UI** |

**Issues Found:**

1. **No Workspace Creation UI** - The `workspace.create` endpoint exists but there's no UI to create new workspaces

2. **No Member Management** - Admins cannot remove members because `workspace.removeMember` has no frontend implementation

---

### 3. Project Module

| Endpoint | Backend Exists | Frontend Uses | Status |
|----------|---------------|---------------|--------|
| `project.list` | ✅ | ✅ | **ACTIVE** |
| `project.byId` | ✅ | ✅ | **ACTIVE** |
| `project.create` | ✅ | ✅ | **ACTIVE** |
| `project.update` | ✅ | ❌ | **UNUSED** |
| `project.delete` | ✅ (admin) | ❌ | **MISSING UI** |

**Issues Found:**

1. **No Project Edit UI** - Projects cannot be renamed or have description/color updated

2. **No Project Delete UI** - Admin users cannot delete projects via frontend

---

### 4. Task Module

| Endpoint | Backend Exists | Frontend Uses | Status |
|----------|---------------|---------------|--------|
| `task.parse` | ✅ | ✅ | **ACTIVE** |
| `task.list` | ✅ | ✅ | **ACTIVE** |
| `task.byId` | ✅ | ❌ | **UNUSED** |
| `task.create` | ✅ | ✅ | **ACTIVE** |
| `task.update` | ✅ | ✅ | **ACTIVE** |
| `task.delete` | ✅ (admin) | ✅ | **ACTIVE** |
| `task.changeStatus` | ✅ | ✅ | **ACTIVE** |
| `task.home` | ✅ | ✅ | **ACTIVE** |
| `task.overdueCount` | ✅ | ✅ | **ACTIVE** |
| `task.search` | ✅ | ✅ | **ACTIVE** |

**Issues Found:**

1. **`task.byId` Unused** - The endpoint exists but frontend always uses `task.list` or `task.home` and stores TaskSummary. Individual task fetching is not implemented. TaskDetail component receives task from store, doesn't fetch by ID.

---

### 5. Sprint Module

| Endpoint | Backend Exists | Frontend Uses | Status |
|----------|---------------|---------------|--------|
| `sprint.list` | ✅ | ✅ | **ACTIVE** |
| `sprint.byId` | ✅ | ❌ | **UNUSED** |
| `sprint.create` | ✅ | ✅ | **ACTIVE** |
| `sprint.update` | ✅ | ✅ | **ACTIVE** |
| `sprint.delete` | ✅ (admin) | ✅ | **ACTIVE** |

**Issues Found:**

1. **`sprint.byId` Unused** - Individual sprint fetching not needed; frontend uses `sprint.list` results

---

### 6. Capacity Module

| Endpoint | Backend Exists | Frontend Uses | Status |
|----------|---------------|---------------|--------|
| `capacity.forSprint` | ✅ | ✅ | **ACTIVE** |
| `capacity.set` | ✅ (admin) | ✅ | **ACTIVE** |

**Verdict:** ✅ Fully covered

---

### 7. Velocity Module

| Endpoint | Backend Exists | Frontend Uses | Status |
|----------|---------------|---------------|--------|
| `velocity.live` | ✅ | ✅ | **ACTIVE** |
| `velocity.snapshot` | ✅ | ✅ | **ACTIVE** |
| `velocity.custom` | ✅ | ✅ | **ACTIVE** |

**Verdict:** ✅ Fully covered

---

### 8. Comment Module

| Endpoint | Backend Exists | Frontend Uses | Status |
|----------|---------------|---------------|--------|
| `comment.list` | ✅ | ✅ | **ACTIVE** |
| `comment.create` | ✅ | ✅ | **ACTIVE** |
| `comment.update` | ✅ | ❌ | **UNUSED** |
| `comment.delete` | ✅ | ✅ | **ACTIVE** |

**Issues Found:**

1. **No Comment Edit UI** - Comments can be created and deleted but there's no UI for editing comments after creation

---

### 9. Checklist Module

| Endpoint | Backend Exists | Frontend Uses | Status |
|----------|---------------|---------------|--------|
| `checklist.list` | ✅ | ✅ | **ACTIVE** |
| `checklist.create` | ✅ | ✅ | **ACTIVE** |
| `checklist.update` | ✅ | ✅ | **ACTIVE** |
| `checklist.toggle` | ✅ | ✅ | **ACTIVE** |
| `checklist.delete` | ✅ | ✅ | **ACTIVE** |
| `checklist.reorder` | ✅ | ❌ | **UNUSED** |

**Issues Found:**

1. **No Checklist Reordering UI** - Drag-and-drop reordering endpoint exists but no frontend implementation for reordering items

---

### 10. Time Entry Module

| Endpoint | Backend Exists | Frontend Uses | Status |
|----------|---------------|---------------|--------|
| `timeEntry.list` | ✅ | ❌ | **UNUSED** |
| `timeEntry.running` | ✅ | ✅ | **ACTIVE** |
| `timeEntry.start` | ✅ | ✅ | **ACTIVE** |
| `timeEntry.stop` | ✅ | ✅ | **ACTIVE** |
| `timeEntry.create` | ✅ | ✅ | **ACTIVE** |
| `timeEntry.update` | ✅ | ❌ | **UNUSED** |
| `timeEntry.delete` | ✅ | ❌ | **UNUSED** |

**Issues Found:**

1. **No Time Entry History** - `timeEntry.list` is not called anywhere; users cannot see past logged time

2. **No Time Entry Edit** - Users cannot edit logged time entries

3. **No Time Entry Delete** - Users cannot delete logged time entries

---

### 11. Notification Module

| Endpoint | Backend Exists | Frontend Uses | Status |
|----------|---------------|---------------|--------|
| `notification.list` | ✅ | ✅ | **ACTIVE** |
| `notification.unreadCount` | ✅ | ✅ | **ACTIVE** |
| `notification.markRead` | ✅ | ✅ | **ACTIVE** |
| `notification.markAllRead` | ✅ | ✅ | **ACTIVE** |

**Verdict:** ✅ Fully covered

---

### 12. Forecast Module

| Endpoint | Backend Exists | Frontend Uses | Status |
|----------|---------------|---------------|--------|
| `forecast.forProject` | ✅ | ✅ | **ACTIVE** |

**Verdict:** ✅ Fully covered

---

### 13. Audit Module

| Endpoint | Backend Exists | Frontend Uses | Status |
|----------|---------------|---------------|--------|
| `audit.forEntity` | ✅ | ✅ | **ACTIVE** |

**Verdict:** ✅ Fully covered

---

## Summary of Findings

### Unused Backend Endpoints (11 endpoints)

| # | Module | Endpoint | Recommendation |
|---|--------|----------|----------------|
| 1 | Workspace | `create` | Add workspace creation UI (Settings/Organization) |
| 2 | Workspace | `removeMember` | Add member management UI in workspace settings |
| 3 | Project | `update` | Add project edit modal/page |
| 4 | Project | `delete` | Add project delete functionality (admin only) |
| 5 | Task | `byId` | Consider removing if not needed, or use for TaskDetail fetch |
| 6 | Sprint | `byId` | Consider removing - list provides needed data |
| 7 | Comment | `update` | Add comment edit functionality |
| 8 | Checklist | `reorder` | Implement drag-and-drop reordering |
| 9 | TimeEntry | `list` | Add time entry history view |
| 10 | TimeEntry | `update` | Add edit functionality for time entries |
| 11 | TimeEntry | `delete` | Add delete functionality for time entries |

### Missing Frontend Features (Backend has capability, no UI)

1. **Workspace Creation** - Users cannot create new workspaces from UI
2. **Workspace Settings** - No member management, no workspace editing
3. **Project Editing** - Cannot rename or update project details after creation
4. **Project Deletion** - Admin cannot delete projects via frontend
5. **Comment Editing** - Comments can only be created/deleted, not edited
6. **Checklist Reordering** - Cannot reorder checklist items via drag-and-drop
7. **Time Entry History** - Cannot view logged time entries
8. **Time Entry Management** - Cannot edit or delete logged time

---

## Incomplete CRUD Operations

| Entity | Create | Read | Update | Delete |
|--------|--------|------|--------|--------|
| Workspace | ❌ No UI | ✅ | ❌ No UI | ❌ No endpoint |
| Project | ✅ | ✅ | ❌ No UI | ❌ No UI |
| Task | ✅ | ✅ | ✅ | ✅ (admin) |
| Sprint | ✅ | ✅ | ✅ | ✅ (admin) |
| Comment | ✅ | ✅ | ❌ No UI | ✅ |
| Checklist Item | ✅ | ✅ | ✅ | ✅ |
| Time Entry | ✅ | ❌ No UI | ❌ No UI | ❌ No UI |
| Capacity | N/A | ✅ | ✅ (admin) | N/A |

---

## Recommendations

### High Priority

1. **Add Time Entry History** - Users need visibility into logged work
2. **Add Comment Edit** - Basic content editing capability missing
3. **Add Project Edit/Delete** - Essential project management features

### Medium Priority

4. **Add Workspace Management** - Creation and member management
5. **Add Checklist Reordering** - UX improvement for task checklists
6. **Add Time Entry Edit/Delete** - Correct mistakes in logged time

### Low Priority

7. **Evaluate `task.byId` usage** - Either use it for detail fetching or remove
8. **Evaluate `sprint.byId` usage** - Consider removal if never needed
9. **Clean up unused time entry list** - If history not planned, simplify

---

## Error Handling Analysis

Frontend error handling patterns observed:
- Most API calls use `try/catch` with `console.error` logging
- Some silent failures (e.g., `trpc.task.parse.query` in QuickAddInput uses `.catch(() => {})`)
- User-facing errors shown through local error state variables
- No global error handling or toast notifications

**Files with error patterns:**
- QuickAddInput.svelte (line 124) - Silent failure for parser
- SprintEditModal.svelte (lines 78-79) - Shows error to user
- TaskDetail.svelte (lines 61-63, 86-88) - Console logging only