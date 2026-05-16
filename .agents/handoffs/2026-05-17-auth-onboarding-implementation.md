# Session Handoff: Auth Flow & Onboarding Implementation

**Date:** 2026-05-17  
**Project:** /Volumes/MacExtend/Peronal/PM-manager  
**Session Duration:** ~3-4 hours

## Current State

**Task:** Building signup/login flow with organization onboarding for Saha  
**Phase:** Implementation - security fixes applied, debugging cross-origin auth  
**Progress:** ~90% - auth flow works, cross-origin cookie issue being debugged

## What We Did

Implemented complete auth flow with WorkOS AuthKit:
- Removed auto-creation of personal orgs (now explicit user choice)
- Created onboarding page with 3 options: Personal Workspace, Company Organization, Wait for Invite
- Added proper session management with cryptographic tokens (security fix)
- Fixed Svelte 5 runes patterns for stores (class-based exports)
- Applied CORS and cookie fixes for cross-origin requests

## Decisions Made

- **WorkOS as source of truth** — Organizations managed in WorkOS, not local DB
- **Session tokens vs raw user IDs** — Fixed critical security issue by using `randomBytes(32)` tokens stored in `sessions` table
- **Class-based Svelte stores** — Svelte 5 doesn't allow exporting reassigned `$state`, so all stores use class pattern: `export const auth = new AuthStore()`
- **SameSite=None cookies** — Required because `saha.localhost` and `api.saha.localhost` are different sites
- **Onboarding redirect logic** — Check both `isNew` AND `organizations.length === 0` (user might exist but have no orgs)

## Code Changes

### Backend (packages/api)

- `src/db/schema.ts` — Added `sessions` table with `id`, `token`, `userId`, `createdAt`, `expiresAt`
- `src/modules/auth/auth.service.ts` — 
  - Removed auto-org-creation from `exchangeCode()`
  - Added `createSession()`, `validateSession()`, `deleteSession()` for proper session tokens
  - Added `hasOrganization()`, `createPersonalOrganization()`, `createCompanyOrganization()`
  - Added rollback pattern (delete WorkOS org if DB transaction fails)
  - Added idempotency checks (prevent duplicate org creation)
  - Imported proper `OrganizationMembership` type from WorkOS SDK
- `src/modules/auth/auth.router.ts` —
  - Changed `hasOrganization` from `publicProcedure` to `protectedProcedure`
  - Added `createPersonalOrg` and `createCompanyOrg` protected procedures
  - Changed cookies to `SameSite=None; Secure` for cross-origin

### Frontend (packages/web)

- `src/lib/stores/auth.svelte.ts` — NEW: Class-based auth store with `user`, `isLoading`, `workosUserId`, login/logout/callback methods
- `src/lib/stores/organization.svelte.ts` — NEW: Class-based org store
- `src/lib/stores/toast.svelte.ts` — NEW: Class-based toast store
- `src/lib/trpc.ts` — NEW: TrPC client with `credentials: 'include'` for cross-origin cookies
- `src/lib/components/Toast.svelte` — NEW: Toast component with SSR-safe `$derived` pattern
- `src/routes/+page.svelte` — NEW: Home page (Coming Soon + welcome message)
- `src/routes/auth/callback/+page.svelte` — MODIFIED: Redirect logic checks `isNew || organizations.length === 0`
- `src/routes/auth/onboarding/+page.svelte` — NEW: Onboarding page with 3 options
- `src/routes/auth/login/+page.svelte` — MODIFIED: Uses `auth.login()` from new store
- `src/routes/auth/logout/+page.svelte` — MODIFIED: Uses `auth.logout()` from new store

### Shared

- `packages/shared/src/index.ts` — Made `createdAt` and `updatedAt` optional in User interface (auth endpoints return partial user)

### Database

- Migration `0002_melodic_blade.sql` — Creates `sessions` table

## Open Questions

- [ ] Is cross-origin auth working? Last fix was `SameSite=None; Secure` cookies - needs testing
- [ ] Should we add `credentials: 'include'` to all fetch calls in the app?

## Blockers / Issues

**Cross-origin cookie issue:**
- User tested with curl - cookies not being sent in requests
- Fixed by adding `credentials: 'include'` to TrPC client
- Fixed by changing cookies to `SameSite=None; Secure`
- **Needs verification** - user should test fresh login flow

**Database sessions table:**
- Was missing, migration created and applied
- Run `bun run db:migrate` if starting fresh

## Context to Remember

### Architecture
- **WorkOS handles all organization identity** — No local `organizations` table exists
- **Saha only stores**: `users`, `workspaces`, `workspaceMembers`, `organizationSettings`, `projects`, `sessions`
- **Organization ID is WorkOS org ID** — stored as text, references WorkOS

### Environment Setup
- Frontend: `https://saha.localhost` (SvelteKit on Vite)
- Backend: `https://api.saha.localhost` (Hono + TrPC)
- Both use `.localhost` domain with SSL certs (via portless?)
- WorkOS callback: `https://saha.localhost/auth/callback`

### Key Env Vars
- `WORKOS_API_KEY`
- `WORKOS_CLIENT_ID`
- `BASE_URL` (e.g., `https://saha.localhost`)
- `DATABASE_URL`

### Svelte 5 Patterns
- **Never export `$state` directly** — use class pattern
- **SSR-safe** — use `$derived` for reactive access in components
- **Effects run server-side** — don't wrap in `if (browser)`

### Database Commands
```bash
cd packages/api
bun --env-file=.env run db:generate  # Generate migration
bun --env-file=.env run db:migrate   # Apply migration
bun --env-file=.env run src/db/reset.ts  # Truncate all tables
```

## Next Steps

1. [ ] **Test cross-origin auth** — Clear cookies, restart servers, try full login flow
2. [ ] If cookies still not working, check browser devtools Network tab for Set-Cookie headers
3. [ ] Verify session cookie is sent with subsequent TrPC requests
4. [ ] Test company org creation flow
5. [ ] Consider adding toast notifications for errors in onboarding

## Files to Review on Resume

- `packages/api/src/modules/auth/auth.router.ts` — Cookie settings, procedure definitions
- `packages/api/src/modules/auth/auth.service.ts` — Core auth logic, session management
- `packages/web/src/lib/trpc.ts` — TrPC client with credentials config
- `packages/web/src/lib/stores/auth.svelte.ts` — Auth store (class pattern)
- `packages/web/src/routes/auth/callback/+page.svelte` — Redirect logic
- `packages/web/src/routes/auth/onboarding/+page.svelte` — Onboarding UI

## Quick Debug Commands

```bash
# Reset database
cd packages/api && bun --env-file=.env run src/db/reset.ts

# Check tables in DB (via postgres MCP)
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

# Count users/sessions
SELECT 'users' as t, COUNT(*) FROM users UNION ALL SELECT 'sessions', COUNT(*) FROM sessions;

# Typecheck all
bun run typecheck
```