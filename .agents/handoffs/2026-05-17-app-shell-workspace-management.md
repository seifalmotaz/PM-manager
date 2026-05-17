# Session Handoff: App Shell, Home Page & Workspace Management

**Date:** 2026-05-17
**Project:** /Volumes/MacExtend/Peronal/PM-manager
**Session Duration:** ~3-4 hours

## Current State

**Task:** Building the app shell, home page with Kanban board, and workspace management UI
**Phase:** Implementation + Debugging
**Progress:** ~85% — All UI and backend built, auth/refresh issue being debugged

## What We Did

Built the complete app shell (Slack-style three-pane layout) with org bar, navigation sidebar, top bar, and home page Kanban board. Then built workspace management with create/edit modals, backend endpoints, and WorkOS admin role checks. Spent significant time debugging the cross-origin auth cookie issue causing login-required-on-refresh behavior.

## Decisions Made

- **Slack-style layout** — Far-left org bar (68px) + nav sidebar (240px) + main content. Matches the design reference image.
- **Cookie domain: `.saha.localhost`** — Added `Domain=.saha.localhost` to session cookies so both `saha.localhost` and `api.saha.localhost` share them. Old cookies were scoped to `api.saha.localhost` only.
- **Client-side auth restoration** — `auth.svelte.ts` constructor calls `restoreSession()` which hits `trpc.auth.session.query()`. The server hook (`hooks.server.ts`) no longer redirects on missing cookies — lets the client handle auth.
- **WorkOS roles for org admin** — `checkOrgAdmin()` queries WorkOS `listOrganizationMemberships` to verify admin/owner role. Extracted from middleware into a plain function to avoid tRPC input parsing order issues.
- **Org roles cached in localStorage** — `organization.svelte.ts` persists `orgRoles` alongside orgs. `isOrgAdmin(orgId)` checks cached roles.
- **Workspace creation scoped to org** — `workspace.create` now requires `organizationId` and stores it. `workspace.list` filters by org.
- **Privacy-safe sidebar** — Per PRD §14, the sidebar shows only generic labels (Home, Velocity, Projects). Workspace names do NOT appear.

## Code Changes

### Files Created (13)

| File | Purpose |
|---|---|
| `packages/api/src/db/migrations/0003_outgoing_switch.sql` | Adds `workos_user_id` to `users` table |
| `packages/web/src/lib/components/layout/AppShell.svelte` | Orchestrates TopBar + OrgBar + NavSidebar + main area |
| `packages/web/src/lib/components/layout/OrganizationBar.svelte` | Far-left sidebar with org icons, active indicator, user avatar |
| `packages/web/src/lib/components/layout/NavigationSidebar.svelte` | Second sidebar with nav items (Home/Velocity/Projects), workspace link, timer slot |
| `packages/web/src/lib/components/layout/TopBar.svelte` | Top bar with org switcher, search placeholder, notifications, user avatar |
| `packages/web/src/lib/components/board/KanbanBoard.svelte` | Main Kanban with 3 columns (To Do / In Progress / Done) |
| `packages/web/src/lib/components/board/KanbanColumn.svelte` | Single Kanban column with header, task list, add button |
| `packages/web/src/lib/components/tasks/TaskCard.svelte` | Task card with title, priority badge (P0-P3), project label, due date |
| `packages/web/src/lib/components/time/Timer.svelte` | Bottom-of-sidebar timer placeholder ("Start session") |
| `packages/web/src/lib/components/workspaces/WorkspaceCard.svelte` | Workspace card with name, type badge, member count, date, edit button |
| `packages/web/src/lib/components/workspaces/CreateWorkspaceModal.svelte` | Modal for creating workspaces |
| `packages/web/src/lib/components/workspaces/EditWorkspaceModal.svelte` | Modal for renaming workspaces |
| `packages/web/src/routes/workspaces/+page.svelte` | Workspace management page with grid, empty state, loading state |

### Files Modified (12)

| File | Change |
|---|---|
| `packages/api/src/db/schema.ts` | Added `workosUserId` field to users table |
| `packages/api/src/modules/auth/auth.service.ts` | Persists `workosUserId` on login; extracts `orgRoles` from WorkOS memberships |
| `packages/api/src/modules/auth/auth.router.ts` | Returns `orgRoles` in callback; includes `workosUserId` in session response |
| `packages/api/src/trpc.ts` | Added `checkOrgAdmin()` function (replaced broken `orgAdminProcedure` middleware) |
| `packages/api/src/modules/workspace/workspace.router.ts` | `create` uses `checkOrgAdmin` + `organizationId`; added `update` endpoint; `list` filters by org |
| `packages/api/src/modules/workspace/workspace.service.ts` | `createCompanyWorkspace` requires `organizationId`; added `updateWorkspace` |
| `packages/api/src/modules/workspace/workspace.service.spec.ts` | Updated tests for org-scoped creation and update |
| `packages/web/src/routes/+layout.svelte` | Conditionally wraps non-auth pages in AppShell |
| `packages/web/src/routes/+page.svelte` | Replaced "Coming Soon" with KanbanBoard; waits for auth restoration before redirecting |
| `packages/web/src/lib/stores/auth.svelte.ts` | Auto-restores session on init; restores `workosUserId` from localStorage |
| `packages/web/src/lib/stores/organization.svelte.ts` | Added `orgRoles` state, `isOrgAdmin()`, persistence |
| `packages/web/src/lib/stores/workspace.svelte.ts` | Workspace store: load, create, update, modal state |
| `packages/web/src/hooks.server.ts` | **Removed server-side auth redirect** — now allows all requests through |

## Open Questions

- [ ] Does logging out and back in resolve the 401 errors on `workspace.list` after refresh?
- [ ] Is the cookie visible in browser devtools with `Domain=.saha.localhost` after fresh login?
- [ ] Should we add `workosUserId` restoration to `auth.checkSession()` for users who had sessions before the migration?
- [ ] Do we need a `deleteWorkspace` endpoint and UI?

## Blockers / Issues

### Cross-origin cookie issue (ACTIVE)

**Symptom:** After refresh, protected endpoints (`workspace.list`, etc.) return 401 "Authentication required". The orgs still appear in the sidebar (from `localStorage` cache). User can see the UI but API calls fail.

**History of fixes applied:**
1. Added `credentials: 'include'` to TrPC client — already existed
2. Changed cookies to `SameSite=None; Secure` — already existed
3. Added `Domain=.saha.localhost` to cookies — **applied, but old cookies still active**
4. Removed `hooks.server.ts` redirect — applied, page now loads client-side
5. Added client-side auth restoration (`auth.svelte.ts` constructor) — applied

**Current hypothesis:** The user's browser still holds the OLD cookie (set before `Domain=.saha.localhost` was added). The old cookie is scoped to `api.saha.localhost` only. On refresh, the SvelteKit server at `saha.localhost` can't see it (no longer an issue since we removed the hook redirect). The client-side `restoreSession()` calls `trpc.auth.session.query()` — if the cookie IS being sent to `api.saha.localhost`, this should work. But `workspace.list` also goes to `api.saha.localhost` and uses the same cookie... so both should work or both fail.

**Next debugging step:** Log out completely, clear cookies for both domains, log back in, verify the new cookie has `Domain=.saha.localhost`, then test refresh.

**If issue persists:** Check browser devtools Network tab:
- Is `session` cookie present in the request headers for `trpc` calls?
- Does `auth.session` work but `workspace.list` fails? (Shouldn't happen with same middleware)
- Is the session token valid in the database? (`SELECT * FROM sessions WHERE token = '...'`)

## Context to Remember

### Architecture
- **Frontend:** `https://saha.localhost` (SvelteKit on Vite)
- **Backend:** `https://api.saha.localhost` (Hono + TrPC)
- **WorkOS handles org identity** — No local `organizations` table
- **Cookie:** `session=${token}; HttpOnly; Path=/; SameSite=None; Secure; Domain=.saha.localhost; Max-Age=2592000`

### Key Env Vars
- `WORKOS_API_KEY`
- `WORKOS_CLIENT_ID`
- `BASE_URL` (e.g., `https://saha.localhost`)
- `DATABASE_URL`

### Svelte 5 Patterns
- **Never export `$state` directly** — use class pattern
- **Stores use `.svelte.ts` extension** with `$state` inside class methods
- **SSR-safe** — use `$derived` for reactive access in components

### Database Commands
```bash
cd packages/api
bun --env-file=.env run db:migrate   # Apply migration
cd packages/web
bun run typecheck                     # Check types
```

## Next Steps

1. [ ] **Test fresh login** — Log out, clear cookies, log back in, verify `Domain=.saha.localhost` in cookie
2. [ ] **Verify refresh works** — After fresh login, refresh the page and confirm no 401 errors
3. [ ] **If 401s persist** — Debug cookie visibility in devtools, check session validity in DB
4. [ ] **Add project management UI** — Next feature after workspace management is working
5. [ ] **Add real task data** — Replace Kanban dummy data with actual tasks from backend

## Files to Review on Resume

- `packages/web/src/lib/stores/auth.svelte.ts` — Session restoration logic (constructor calls `restoreSession()`)
- `packages/web/src/hooks.server.ts` — No longer redirects; allows client-side auth
- `packages/api/src/modules/auth/auth.router.ts` — Cookie domain setting (lines 19-20, 58-59)
- `packages/api/src/trpc.ts` — `checkOrgAdmin()` function for WorkOS role checks
- `packages/web/src/routes/+page.svelte` — Auth guard pattern (waits for `auth.isLoading`)
- `packages/web/src/routes/workspaces/+page.svelte` — Workspace page with auth guard

## Quick Debug Commands

```bash
# Check tables in DB
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

# Check if user's workosUserId is set
SELECT id, email, name, workos_user_id FROM users;

# Check active sessions
SELECT token, user_id, expires_at FROM sessions;

# Check workspaces for an org
SELECT id, name, slug, organization_id, type FROM workspaces;
```
