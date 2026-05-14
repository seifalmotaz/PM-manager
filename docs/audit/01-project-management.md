# Project Management Features Audit Report

**Audit Date:** May 15, 2026  
**Audited Module:** Project Management  
**Severity Distribution:** 4 Critical, 3 High, 3 Medium, 3 Low

---

## Executive Summary

The PM-manager application has **partially implemented project management features** with significant gaps. While basic CRUD operations exist in the backend API, the **frontend only exposes Create and Read operations**. Critical features like project editing, deletion, and archiving are completely missing from the UI, creating dead ends for users who need to manage their projects.

---

## 1. Project Creation Flow

### Current State

**Backend (API):**
- File: `/packages/api/src/modules/project/project.router.ts` (lines 22-33)
- File: `/packages/api/src/modules/project/project.service.ts` (lines 50-76)
- Endpoint: `protectedProcedure` mutation `project.create`
- Creates project with: `workspaceId`, `name`, `description`, `color` (optional)
- Automatically sets `isInbox: false`
- Creates audit log entry on creation

**Frontend (Web):**
- File: `/packages/web/src/routes/(app)/projects/+page.svelte` (lines 47-66, 84-102)
- Inline creation form with toggle button ("Add Project")
- Fields: workspace selection dropdown, project name (required), color picker, description (optional)
- Form validation: requires project name and workspace selection
- Success feedback: re-loads project list after creation

### Issues Found

| Severity | Issue | Location |
|----------|-------|----------|
| **Medium** | No error feedback to user on creation failure - only console.error | `+page.svelte` line 61-62 |
| **Low** | Workspace selection defaults to first workspace without clear indication | `+page.svelte` lines 33-35 |
| **Low** | Color picker always defaults to `#db4c3f` with no randomization | `+page.svelte` line 12 |

### Missing Elements

1. **No duplicate project name validation** - Backend doesn't enforce unique names within workspace
2. **No loading state indicator** during project creation when user clicks "Add Project" button
3. **No success notification** after project is created (projects just silently appear in list)

### UX Problems

1. **Form visibility toggle** - The "Add Project" button toggles form visibility, but when form is open, button text changes to "Cancel" which is confusing (lines 77-80)
2. **No confirmation on cancel** - If user fills form and cancels, all data is lost without warning

---

## 2. Project Listing / Viewing

### Current State

**Backend (API):**
- File: `/packages/api/src/modules/project/project.service.ts` (lines 8-37)
- Endpoint: `project.list` query
- Returns projects ordered alphabetically by name
- Supports optional `workspaceId` filter
- Verifies workspace membership before returning projects

**Frontend (Web):**
- File: `/packages/web/src/routes/(app)/projects/+page.svelte` (lines 112-137)
- Projects grouped by workspace in collapsible sections
- Each project shows: color icon, name, description (optional)
- Clicking project navigates directly to Kanban view: `/project/[id]/kanban`
- Empty state shown for workspaces with no projects

### Issues Found

| Severity | Issue | Location |
|----------|-------|----------|
| **High** | No project overview/settings page - cannot view full project details | Navigation logic line 117 |
| **Medium** | Project link goes to Kanban, not project home page | `+page.svelte` line 117 |
| **Low** | Loading spinner text says "Loading projects..." but could be more specific | Line 109 |

### Missing Elements

1. **No project overview page** - Users jump straight to Kanban view without seeing project details
2. **No search/filter for projects** - Large lists of projects would be hard to navigate
3. **No sorting options** - Can't sort by creation date, color, etc.
4. **No project metadata display** - Creation date, last modified date not shown

### UX Problems

1. **Dead end navigation** - User cannot click into a project and see its settings/config
2. **No workspace collapse/expand** - All workspaces shown expanded, no way to collapse
3. **Project description truncation** - No character limit shown or enforced, could overflow UI

---

## 3. Project Details / Edit

### Current State

**Backend (API):**
- File: `/packages/api/src/modules/project/project.router.ts` (lines 35-46)
- File: `/packages/api/src/modules/project/project.service.ts` (lines 78-136)
- Endpoint: `project.update` mutation
- Allows updating: `name`, `description`, `color`
- Creates per-field audit entries for changed fields
- Updates `updatedAt` timestamp

**Frontend (Web):**
- ✗ **NOT IMPLEMENTED** - No UI exists for editing project details

### Issues Found

| Severity | Issue | Location |
|----------|-------|----------|
| **Critical** | No frontend UI to edit project details | Entire feature missing |
| **Critical** | No way to change project name after creation | Missing implementation |
| **Critical** | No way to change project description | Missing implementation |
| **Critical** | No way to change project color | Missing implementation |

### Missing Elements

1. **No project settings page** - Should exist at `/project/[id]/settings` or similar
2. **No edit modal/dialog** - Similar to SprintEditModal pattern exists but not for projects
3. **No inline editing** - Can't edit project name directly from list
4. **No project detail view** - Can't see full description, creation date, etc.

### Dead Ends

**Major Dead End:** Users can create projects but cannot modify them afterward. This is a critical gap in the user journey:
1. User creates project with typo in name → No way to fix
2. User wants to update project description → No way to do it
3. User needs to change project color → No option available

---

## 4. Project Deletion / Archive

### Current State

**Backend (API):**
- File: `/packages/api/src/modules/project/project.router.ts` (lines 48-52)
- File: `/packages/api/src/modules/project/project.service.ts` (lines 138-152)
- Endpoint: `adminProcedure` mutation `project.delete` (admin only!)
- Hard-deletes project (no soft-delete/archive)
- Creates audit log with action 'deleted'
- Cascades delete to tasks, sprints, etc. (via db foreign key constraints)

**Frontend (Web):**
- ✗ **NOT IMPLEMENTED** - No UI exists for deleting projects

### Issues Found

| Severity | Issue | Location |
|----------|-------|----------|
| **Critical** | No frontend UI to delete projects | Entire feature missing |
| **Critical** | Admin-only deletion excludes regular members | API design flaw |
| **High** | No archive functionality despite being documented in CONTEXT.md | Missing implementation |
| **High** | Hard-delete with no confirmation recovery path | Missing safety mechanism |

### Missing Elements

**Per CONTEXT.md (lines 16, 84):**
> A Project can be **Archived** (work is complete, becomes read-only, moved to Archived section, recoverable) or **Soft-Deleted** (created by mistake, hidden in Trash, recoverable for N days, then permanently purged).

1. **Archive feature** - Completely unimplemented in both API and UI
2. **Soft-delete** - Not implemented, only hard-delete exists
3. **Archived section** - No UI to view archived projects
4. **Trash/recovery** - No recovery mechanism for deleted projects
5. **Inbox project protection** - Cannot delete `isInbox: true` projects (per CONTEXT.md line 93), but no implementation to prevent this

### Questionable Design Decisions

1. **Admin-only deletion**: The `deleteProject` endpoint uses `adminProcedure`, meaning regular workspace members cannot delete projects they created. This contradicts typical UX expectations where project creators should have deletion rights.

2. **Hard-delete only**: The implementation permanently deletes projects with no recovery option, which is dangerous for a PM tool:
   - Accidental deletions cannot be undone
   - No "soft delete" safety net
   - No "trash bin" for recovery
   - Creates permanent data loss risk

3. **Inconsistent with CONTEXT.md**: Documentation explicitly describes archiving and soft-delete workflows, but implementation only supports hard-delete.

---

## 5. Project-Related CRUD Completeness

### Summary Matrix

| Operation | Backend API | Frontend UI | Status |
|-----------|-------------|-------------|--------|
| Create Project | ✅ Complete | ✅ Complete | **Working** |
| List Projects | ✅ Complete | ✅ Complete | **Working** |
| Get Project Details | ✅ Complete | ⚠️ Missing | **Partial** |
| Update Project | ✅ Complete | ❌ Not Implemented | **Broken** |
| Delete Project | ✅ Complete (admin only) | ❌ Not Implemented | **Broken** |
| Archive Project | ❌ Not Implemented | ❌ Not Implemented | **Missing** |

### Additional CRUD Gaps

| Feature | Backend API | Frontend UI | Notes |
|---------|-------------|-------------|-------|
| Project overview page | N/A | ❌ Missing | Should show project summary |
| Project settings page | N/A | ❌ Missing | Should have dedicated route |
| Bulk project operations | ❌ Missing | ❌ Missing | Cannot bulk delete/archive |
| Project duplication | ❌ Missing | ❌ Missing | Cannot copy a project |

---

## 6. File References

### Backend Files

| File | Purpose |
|------|---------|
| `/packages/api/src/modules/project/project.router.ts` | tRPC router with all project endpoints |
| `/packages/api/src/modules/project/project.service.ts` | Business logic for project operations |
| `/packages/api/src/modules/project/project.schema.ts` | Zod validation schemas |
| `/packages/api/src/modules/project/project.type.ts` | TypeScript interface definitions |
| `/packages/api/src/modules/project/project.service.spec.ts` | Unit tests |
| `/packages/api/src/db/schema.ts` (lines 32-41) | Database schema for projects table |

### Frontend Files

| File | Purpose |
|------|---------|
| `/packages/web/src/routes/(app)/projects/+page.svelte` | Projects list page with creation form |
| `/packages/web/src/routes/(app)/project/[id]/+layout.svelte` | Project layout with tabs header |
| `/packages/web/src/routes/(app)/project/[id]/kanban/+page.svelte` | Project Kanban view |
| `/packages/web/src/routes/(app)/project/[id]/sprints/+page.svelte` | Sprints board view |
| `/packages/web/src/routes/(app)/project/[id]/sprints/+layout.svelte` | Sprints layout with sub-tabs |

---

## 7. Navigation Flow Analysis

### Current User Journey

```
Home → Projects (list) → Click Project → Kanban View
                              ↓
                         [No project details]
                              ↓
                         [No settings]
                              ↓
                         [Cannot edit]
                              ↓
                         [Cannot delete]
                              ↓
                            DEAD END
```

### Expected/User-Journey Gaps

1. **Expected:** Projects list → Project overview → Settings/Edit
2. **Actual:** Projects list → Kanban (skips overview entirely)

3. **Expected:** Project layout → Settings tab → Edit/Delete options
4. **Actual:** Project layout → Only Kanban/Sprints tabs

---

## 8. Specific Recommendations

### Critical (Must Fix)

1. **Create `/project/[id]/settings` page** with:
   - Project name (editable)
   - Description (editable)
   - Color (editable)
   - Creation date (read-only)
   - Last modified date (read-only)
   - Delete/Archive buttons

2. **Add edit functionality** using pattern from `SprintEditModal.svelte`:
   - Create `ProjectEditModal.svelte` component
   - Call `trpc.project.update.mutate()` API
   - Refresh projects list on success

3. **Add delete functionality** with:
   - Confirmation dialog (type project name to confirm)
   - Warning about cascading deletion (tasks, sprints will be lost)
   - Access control check (show only for admins/owners)

4. **Change `deleteProject` from `adminProcedure` to `protectedProcedure`** with authorization check:
   - Allow project creator + workspace admins/owners to delete
   - Block regular members from deleting

### High Priority

5. **Implement archive feature** per CONTEXT.md:
   - Add `archivedAt` timestamp column to projects table
   - Exclude archived projects from main lists
   - Create "Archived" section in Projects page
   - Allow restore from archived state

6. **Implement `isInbox` protection**:
   - Prevent deletion of projects where `isInbox: true`
   - Show visual indicator for Inbox projects
   - Remove delete option from Inbox project UI

7. **Add project overview landing page**:
   - Route: `/project/[id]` (currently redirects or doesn't exist)
   - Show summary: task counts, active sprint, recent activity
   - Quick links to Kanban, Sprints, Settings

### Medium Priority

8. **Add success/error notifications** for project creation:
   - Toast notifications on success
   - User-friendly error messages on failure

9. **Add project search/filter**:
   - Search by project name
   - Filter by workspace
   - Filter by archived/active status

10. **Add project metadata display**:
    - Show creation date
    - Show task count
    - Show last activity date

### Low Priority

11. **Randomize default project color** for variety

12. **Add "Cancel" confirmation** when user has typed in form

---

## 9. Consistency with Other Features

For comparison, here's how other entities handle CRUD:

**Sprints:**
- Create: ✅ Modal (`SprintCreateModal.svelte`)
- Edit: ✅ Modal (`SprintEditModal.svelte`)
- Delete: ✅ Dialog (`SprintDeleteDialog.svelte`)
- All accessible from Sprint Board

**Tasks:**
- Create: ✅ Quick add input + Modal
- Edit: ✅ Detail panel with all fields
- Delete: ✅ Delete button in detail panel
- Full inline editing

**Workspaces:**
- Create: ✅ (via WorkOS)
- View: ✅ Member pages
- Edit: ⚠️ Limited
- Delete: ⚠️ Hard delete only (per CONTEXT.md)

**Projects:**
- Create: ✅ Inline form
- View: ⚠️ Only Kanban/Sprints, no overview
- Edit: ❌ **Missing entirely**
- Delete: ❌ **Missing entirely**

---

## Conclusion

The project management features have significant gaps that create poor user experience:

1. **Users can create projects but cannot edit them** - This is a fundamental CRUD violation
2. **No project details page** - Users cannot view project information beyond the list view
3. **No delete functionality** - Despite backend support, users have no way to delete projects
4. **Archive feature documented but unimplemented** - Major design-doc vs implementation gap
5. **Admin-only deletion is too restrictive** - Regular members cannot manage projects they created

The backend API is complete and well-tested, but the frontend implementation stops at Create and Read, leaving Update and Delete completely absent from the user interface.