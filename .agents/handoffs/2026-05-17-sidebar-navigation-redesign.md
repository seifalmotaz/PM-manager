# Session Handoff: Sidebar Navigation Redesign

**Date:** 2026-05-17 **Project:** /Volumes/MacExtend/Peronal/PM-manager **Session
Duration:** ~1.5 hours

## Current State

**Task:** Redesign the sidebar navigation to match Todoist-style UI with expandable workspace/project tree **Phase:** Implementation (Complete) **Progress:** 100% — All planned phases executed and type-checked

## What We Did

Redesigned the `NavigationSidebar.svelte` from a flat list into a Todoist-style expandable tree, cleaned up the `OrganizationBar.svelte` to remove duplicate user avatars, and fixed the Home button navigation. Created a workspace detail page at `/workspaces/[id]` to support the new sidebar navigation.

## Decisions Made

- **OrganizationBar kept but deduplicated** — Removed duplicate user avatar/logout from OrganizationBar bottom; sidebar now owns the user profile exclusively. Rationale: Two avatars were confusing visual clutter.
- **Expandable workspace/project tree in sidebar** — Workspaces are parent rows with chevrons; projects nest underneath. Rationale: Users can jump directly to any project without visiting workspace page first.
- **Auto-expand on route change** — Visiting `/projects/[id]` auto-expands the parent workspace. Rationale: User always sees where they are in the tree.
- **Workspace click → `/workspaces/[id]`, project click → `/projects/[id]`** — Kept distinct navigation targets per domain model.
- **"Coming Soon" items stay disabled** — User explicitly requested keeping Velocity, Team, Timesheet, Settings disabled.
- **Sidebar self-loads workspaces and projects** — Added `$effect` in sidebar to call `workspace.loadWorkspaces()` and `project.loadProjects()` when active org changes. Rationale: Sidebar must work on any route after refresh (was previously broken when refreshing on workspace detail).

## Code Changes

**Files modified:**

- `packages/web/src/lib/components/layout/NavigationSidebar.svelte` — Complete redesign: org switcher, org info, Home nav, expandable workspace tree with projects, Coming Soon section, user profile. Uses Svelte 5 runes (`$derived`, `$state`, `$effect`).
- `packages/web/src/lib/components/layout/OrganizationBar.svelte` — Removed `auth` import, `User` icon import, `org-bar-bottom` section, and associated CSS. Added `goto` import and wired Home button to `goto('/')`.
- `packages/web/src/lib/components/layout/AppShell.svelte` — Simplified `<NavigationSidebar />` rendering; removed Timer slot usage and Timer import.

**Files created:**

- `packages/web/src/routes/workspaces/[id]/+page.svelte` — Workspace detail page showing workspace header (name, member count, created date) and projects grid using existing `ProjectCard` component. Supports create project via `CreateProjectModal`.

**Key code context:**

Sidebar tree state uses `Set<string>` for expanded workspaces (cloned on every toggle for Svelte 5 reactivity):
```ts
let expandedWorkspaces = $state<Set<string>>(new Set())
function toggleExpand(wsId: string, e: Event) {
  e.stopPropagation(); e.preventDefault()
  const next = new Set(expandedWorkspaces)
  if (next.has(wsId)) next.delete(wsId)
  else next.add(wsId)
  expandedWorkspaces = next
}
```

Projects grouped by workspace via derived:
```ts
let projectsByWorkspace = $derived.by(() => {
  const map = new Map<string, typeof project.projects>()
  for (const p of project.projects) {
    if (!map.has(p.workspaceId)) map.set(p.workspaceId, [])
    map.get(p.workspaceId)!.push(p)
  }
  for (const [, list] of map) { list.sort((a, b) => a.name.localeCompare(b.name)) }
  return map
})
```

## Open Questions

- [ ] Should we persist `expandedWorkspaces` to `localStorage` so tree state survives refresh? (Deferred — not critical for MVP.)
- [ ] Should we add keyboard shortcuts for sidebar navigation (e.g. `⌘+1` Home, `⌘+2` first workspace)?
- [ ] The org switcher dropdown at top of sidebar is visual-only (no click action). Should it open an org selection dropdown, or should we rely solely on the OrganizationBar for org switching?

## Blockers / Issues

- **3 pre-existing TypeScript errors** in `packages/web/src/routes/projects/+page.svelte` (lines 41-43) — `activeOrg` possibly null. These existed before our changes and are unrelated to sidebar.
- **21 pre-existing warnings** — a11y issues in modal overlays, unused CSS selectors. None are from our changes.

## Context to Remember

- Project uses Svelte 5 with runes mode (`$props`, `$derived`, `$state`, `$effect`). No legacy `$:` or `<slot>`.
- Domain model: Organization → Workspace → Project → Task/Sprint.
- Personal workspace cannot be deleted (per CONTEXT.md).
- `isInbox: true` projects get `Inbox` icon in sidebar tree; others get colored dot.
- `project.loadProjects(organizationId)` loads all projects for the org via `trpc.project.listByOrg.query`.
- `workspace.loadWorkspaces(organizationId)` loads workspaces via `trpc.workspace.list.query`.
- Color tokens: `--bg-sidebar: #282828`, `--bg-surface-hover: #363636`, `--brand-primary: #db4c3f`, `--text-muted: #808080`.
- The user explicitly wants "Coming Soon" features (Velocity, Team, Timesheet, Settings) to remain disabled/grayed out in the sidebar.

## Next Steps

1. [ ] Test sidebar tree on real data — expand/collapse, project navigation, active states
2. [ ] Consider persisting expanded workspace state to `localStorage`
3. [ ] Consider making org switcher dropdown functional (or removing it if redundant with OrganizationBar)
4. [ ] Fix pre-existing TS errors in `projects/+page.svelte` when convenient
5. [ ] Enable "Projects" Coming Soon item if user changes mind (it's a working page at `/projects`)

## Files to Review on Resume

- `packages/web/src/lib/components/layout/NavigationSidebar.svelte` — The main file (691 lines). Contains all sidebar logic, tree state, auto-expand, active states, and styling.
- `packages/web/src/lib/components/layout/OrganizationBar.svelte` — Cleaned up. Home button wired, no user avatar.
- `packages/web/src/routes/workspaces/[id]/+page.svelte` — Workspace detail page with projects grid.
- `packages/web/src/lib/stores/project.svelte.ts` — Project store with `loadProjects(organizationId)`.
- `packages/web/src/lib/stores/workspace.svelte.ts` — Workspace store with `loadWorkspaces(organizationId)`.
