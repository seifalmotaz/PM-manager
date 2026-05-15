# Navigation & Application Structure Audit Report

**Audit Date:** May 15, 2026  
**Audited Module:** Navigation, Routing, App Structure  
**Severity Distribution:** 4 Critical, 5 High, 6 Medium, 4 Low

---

## Executive Summary

This PM-manager application (named "Saha") is a **SvelteKit-based project management tool** with WorkOS authentication. The application has a **functional navigation system but several gaps and inconsistencies** that impact user experience.

---

## 1. Main Navigation

### Current State

**File:** `/packages/web/src/routes/(app)/+layout.svelte`

**Navigation Items** (lines 63-67):
```javascript
const navItems = [
  { label: 'Home', icon: Home, href: '/home' },
  { label: 'Velocity', icon: BarChart2, href: '/velocity' },
  { label: 'Projects', icon: Layers, href: '/projects' },
]
```

**Sidebar Structure:**
- Collapsible sidebar with toggle button
- Always accessible from all app pages via main layout
- Includes Settings button in footer (lines 103-110)

### Issues Found

| Severity | Issue | File Reference |
|----------|-------|----------------|
| **Critical** | **No root landing page** - Missing `+page.svelte` at `/routes/` root level. Users visiting `/` will see blank page | `/routes/+layout.svelte` only exists, no page |
| **High** | **Settings button is non-functional** - Button exists but has no `onclick` handler, no route destination, and no settings page exists | Line 104-110 in `+layout.svelte` |
| **Medium** | **Workspace navigation is implicit** - Workspaces appear only as a filter dropdown, no dedicated workspace detail or settings pages | `WorkspaceFilter.svelte` |
| **Medium** | **No visual indication of current location in sidebar** - Only `aria-current` on links, but collapsed sidebar loses context | Lines 88-100 |

### Missing Elements

- **Root Index Route** - No landing/dashboard at `/`
- **Settings Page** - Button present but no `/settings` route
- **Workspace Detail Page** - No `/workspace/[wid]` page (only member routes exist)
- **User Profile Page** - No user profile or account settings route

---

## 2. Breadcrumbs

### Current State

**No breadcrumb component or pattern exists anywhere in the codebase.**

Only localized "back links" exist:
- Project layout has "← Projects" back link (line 34 in `[id]/+layout.svelte`)
- Member page has "Back to workspace" button (line 36-39 in `member/[uid]/+page.svelte`)

### Issues Found

| Severity | Issue | File Reference |
|----------|-------|----------------|
| **High** | **No breadcrumb navigation** - Deep routes like `/project/{id}/sprints/backlog` have no breadcrumb trail | Entire codebase |
| **Medium** | **Inconsistent back navigation** - Some pages have back buttons, others don't | Various |
| **Medium** | **Orphaned feeling** - Users viewing task detail panel or deep routes lose sense of location | Detail panel is modal-style overlay |

### Missing Elements

- **Breadcrumb component** for deep hierarchies
- **Consistent back navigation pattern** across all deep pages

---

## 3. Routing Structure

### Route Map

| Route | Status | Purpose |
|-------|--------|---------|
| `/` | **MISSING** | Should redirect or show landing |
| `/auth/login` | ✅ | Login page |
| `/auth/callback` | ✅ | Auth callback |
| `/auth/logout` | ✅ | Logout handler |
| `/home` | ✅ | Home/dashboard (Task Kanban) |
| `/velocity` | ✅ | Velocity view |
| `/projects` | ✅ | Project list |
| `/project/[id]/kanban` | ✅ | Project Kanban board |
| `/project/[id]/sprints` | ✅ | Sprint board |
| `/project/[id]/sprints/backlog` | ✅ | Backlog management |
| `/workspace/[wid]/member/[uid]` | ✅ | Member profile (deep link) |
| `/settings` | **MISSING** | Referenced but doesn't exist |
| `/workspace/[wid]` | **PARTIAL** | Has layout, no index page |
| `/profile` | **MISSING** | No user profile route |

### Issues Found

| Severity | Issue | File Reference |
|----------|-------|----------------|
| **Critical** | **Root route `/` is dead** - Returns blank page, no redirect to `/home` | Missing `/routes/+page.svelte` |
| **Medium** | **No workspace index page** - `/workspace/[wid]` has only layout, no page | `/routes/(app)/workspace/[wid]/` |
| **Medium** | **Sprint sub-tabs use client state** - Board/Backlog tabs don't change URL, can't be bookmarked or deep-linked | `sprints/+layout.svelte` lines 20-35 |
| **Low** | **Project tabs also client state** - Kanban/Sprints tabs change URL but the project header shows both | `project/[id]/+layout.svelte` lines 41-56 |

### Dead Routes

- `/` - Root route with no page
- `/workspace/[wid]` - Has layout but no index page
- `/settings` - Referenced in sidebar but doesn't exist

### Unreachable Pages (Deep Links)

These pages are **reachable** via direct URL but have **no navigation link**:
- `/workspace/[wid]/member/[uid]` - Only accessible via Capacity table links

---

## 4. Home/Landing Page

### Current State

**Route:** `/home` (via `/home/+page.svelte`)

**Features:**
- Task Kanban/list view toggle
- Workspace filter (topbar)
- Task creation via QuickAddInput
- Task card-click opens detail panel

### Issues Found

| Severity | Issue | File Reference |
|----------|-------|----------------|
| **Low** | **Not the default route** - Users landing on `/` see nothing | Auth callback redirects to `/home` correctly |
| **Low** | **No "Home" breadcrumb or context** - Just shows "Home" title | Line 56 |
| **Info** | **Empty state messaging exists** | Lines 107-108 |

---

## 5. Deep Linking

### Current State

**Direct URL Navigation Supported:**
- `/project/{id}/kanban` ✅
- `/project/{id}/sprints` ✅
- `/project/{id}/sprints/backlog` ✅
- `/workspace/{wid}/member/{uid}` ✅

**Server-side Data Loading:**
- Uses `+page.ts` files for sprint page and member page
- Auth state checked via `hooks.server.ts`

### Issues Found

| Severity | Issue | File Reference |
|----------|-------|----------------|
| **High** | **Sprint sub-tabs are not deep-linkable** - Board/Capacity selector uses client state `activeSubTab` | `sprints/+page.svelte` lines 16-17, 73-82 |
| **Medium** | **Task detail panel is modal overlay** - Can't share URL to specific task | Uses `selectedTask` store, not URL param |
| **Low** | **List view "coming soon"** - List view option exists but shows placeholder | `kanban/+page.svelte` lines 126-130 |

### Missing Elements

- **Task deep linking** via URL hash or query param
- **Preserved scroll position** on navigation

---

## 6. Back Navigation / History Management

### Current State

**Browser History:**
- SvelteKit handles basic history via `<a href>` links
- No custom history stack management

**App Navigation:**
- Back buttons exist on some pages (project, member)
- Sidebar provides main navigation consistency

### Issues Found

| Severity | Issue | File Reference |
|----------|-------|----------------|
| **Medium** | **Task detail panel uses store, not URL** - Closing panel doesn't affect browser history | `selectedTask` store pattern |
| **Medium** | **Back button inconsistency** - Member page "Back to workspace" goes to `/projects` not the actual workspace | Line 30 in `member/[uid]/+page.svelte` |
| **Low** | **No "back to project" from sprint deep routes** | Backlog page has no back button |

---

## 7. Mobile Responsiveness

### Current State

**Main Layout Responsive CSS** (lines 447-472 in `+layout.svelte`):
```css
@media (max-width: 1024px) {
  /* Detail panel becomes fixed overlay */
}

@media (max-width: 768px) {
  /* Hide nav labels, command placeholder, quick-add text */
}
```

**Sidebar Behavior:**
- Default: `isSidebarCollapsed = true` (starts collapsed)
- Can expand/collapse on all screen sizes
- No hamburger menu for mobile

**Topbar Behavior:**
- Workspace filter available on all sizes
- Command palette accessible via keyboard shortcut

### Issues Found

| Severity | Issue | File Reference |
|----------|-------|----------------|
| **High** | **No mobile navigation drawer/hamburger** - On small screens, collapsed sidebar icons only, users can't see menu text | No mobile nav pattern |
| **High** | **Detail panel overlaps content on tablets** - 1024px breakpoint causes overlay instead of push | Lines 448-459 |
| **Medium** | **Touch targets may be small** - Nav links 48px height, but collapsed icons are harder to find | Lines 266-275 |
| **Medium** | **Command palette search input hidden** - `display: none` on placeholder text at 768px makes it unclear | Lines 462-466 |
| **Low** | **No mobile-specific gestures** - No swipe to close detail panel, etc. | Entire codebase |

### Missing Elements

- **Mobile drawer navigation** (hamburger menu)
- **Collapsible topbar actions** on mobile
- **Responsive sprint/kanban boards** (horizontal scroll only)

---

## 8. Command Palette

### Current State

**File:** `/packages/web/src/lib/components/CommandPalette.svelte`

**Features:**
- Opens with `Cmd/Ctrl + K`
- Search tasks across workspaces
- Navigate to `/home`, `/velocity`, `/projects`
- Quick create tasks with `>` prefix
- Navigation commands with `/` prefix

### Issues Found

| Severity | Issue | File Reference |
|----------|-------|----------------|
| **Medium** | **Missing many navigation options** - No project-specific, workspace, or settings navigation | Lines 62-66 |
| **Medium** | **Project navigation incomplete** - No direct navigation to specific projects in command palette | Lines 62-66 |
| **Low** | **Quick create "not implemented"** - Console.log placeholder, doesn't actually create | Line 121 |

---

## 9. UX Problems Summary

### Navigation Confusion

1. **"Settings" in sidebar does nothing** - Misleading to users
2. **No root path** - `/` shows blank, confusing first-time visitors
3. **Workspace is filter-only** - Users can't view workspace details or settings
4. **Sprint tabs aren't URL-addressable** - Can't bookmark Board vs Backlog view
5. **Task detail is modal overlay** - Can't share URL to specific task

### Layout Issues

1. **Project layout has redundant "Back to Projects"** when you're navigating within project children
2. **Member page back button goes to wrong location** - Should go to workspace, goes to projects
3. **Sprints sub-navigation confusing** - Two-level tabs (Board/Capacity and Board/Backlog)

### Accessibility

1. **Collapsed sidebar icons need `aria-label`** - Currently uses `title` attribute only
2. **Detail panel has no escape key close** documented
3. **Mobile nav is not properly accessible** - Hidden labels hurt screen readers

---

## 10. File References

### Key Files Audited

| Category | File Path |
|----------|-----------|
| Main Layout | `/routes/(app)/+layout.svelte` |
| Root Layout | `/routes/+layout.svelte` |
| Auth Guard | `/hooks.server.ts` |
| Auth Store | `/lib/stores/auth.svelte.ts` |
| Home Page | `/routes/(app)/home/+page.svelte` |
| Projects List | `/routes/(app)/projects/+page.svelte` |
| Project Layout | `/routes/(app)/project/[id]/+layout.svelte` |
| Project Kanban | `/routes/(app)/project/[id]/kanban/+page.svelte` |
| Sprint Board | `/routes/(app)/project/[id]/sprints/+page.svelte` |
| Sprint Layout | `/routes/(app)/project/[id]/sprints/+layout.svelte` |
| Backlog | `/routes/(app)/project/[id]/sprints/backlog/+page.svelte` |
| Velocity | `/routes/(app)/velocity/+page.svelte` |
| Member Page | `/routes/(app)/workspace/[wid]/member/[uid]/+page.svelte` |
| Command Palette | `/lib/components/CommandPalette.svelte` |
| Workspace Filter | `/lib/components/WorkspaceFilter.svelte` |
| Capacity Table | `/lib/components/CapacityTable.svelte` |
| Task Detail | `/lib/components/TaskDetail.svelte` |
| Sidebar Navigation | Lines 63-67 in `+layout.svelte` |
| Settings Button | Lines 103-110 in `+layout.svelte` |
| Mobile Styles | Lines 447-472 in `+layout.svelte` |

---

## Recommendations

### Critical (Must Fix)

1. **Add root route redirect:**
   - Create `/routes/+page.svelte` that redirects to `/home`

2. **Implement Settings page or remove button:**
   - Either create `/settings` or change Settings to a placeholder dialog

3. **Fix Member page back navigation:**
   - Link should go to workspace overview, not projects

### High Priority

4. **Add breadcrumb component:**
   - Implement global breadcrumbs for `project/[id]/*` routes

5. **Make sprint sub-tabs URL-addressable:**
   - Use query params or sub-routes

6. **Add mobile hamburger menu:**
   - Implement drawer pattern for `< 768px`

7. **Implement workspace detail page:**
   - Add `/workspace/[wid]` landing page

### Medium Priority

8. **Enhance command palette:**
   - Add project navigation, user profile, settings

9. **Consider task URL state:**
   - Add `?task={id}` query param for deep linking

10. **Add error boundaries:**
    - Create `+error.svelte` pages for error states

### Low Priority

11. **Preserve scroll position:**
    - Implement scroll restoration on navigation

12. **Add touch gestures:**
    - Swipe to close detail panel on mobile

13. **Implement list view for Kanban:**
    - Currently placeholder