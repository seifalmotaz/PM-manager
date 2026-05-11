# Implementation Spec: Saha - Phase 1

**Contract**: ./contract.md
**PRD**: ./prd-phase-1.md
**Estimated Effort**: M

## Technical Approach

Phase 1 establishes the full technical foundation. We scaffold a Bun monorepo with three packages: `web` (SvelteKit), `api` (Elysia), and `shared` (common types). The Elysia app defines the full Drizzle schema for all v1 tables, generates migrations, and mounts an auth module for WorkOS OAuth. The SvelteKit app sets up routes with an authenticated layout group `(app)` and an auth group for login/callback. Eden Treaty provides the type-safe bridge between frontend and backend.

The layout shell is minimal by design: sidebar with three icon-only items (Home, Velocity, Projects), top bar with placeholder slots for workspace filter, notifications, and search (populated in later phases). No workspace or company names appear anywhere in the sidebar — this is enforced structurally, not by runtime hiding.

WorkOS handles authentication. On first login, the auth callback creates the user record and auto-creates a personal workspace. Session tokens are stored in httpOnly cookies and validated by Elysia middleware on every request.

## Feedback Strategy

**Inner-loop command**: `bun run --filter api test && bun run --filter web check`

**Playground**: Test suite for API (auth flow, schema), SvelteKit dev server for layout verification.

**Why this approach**: Phase 1 is infrastructure-heavy — auth, schema, routing. Tests validate the data layer and auth flow deterministically. The dev server validates the layout renders correctly.

## File Changes

### New Files

| File Path | Purpose |
|---|---|
| `package.json` | Root monorepo with workspace scripts (`dev`, `build`, `db:migrate`, `db:seed`) |
| `bun-workspaces.yaml` | Config: `packages/web`, `packages/api`, `packages/shared` |
| `packages/api/package.json` | Elysia backend dependencies |
| `packages/api/drizzle.config.ts` | Drizzle configuration (schema path, migrations dir, dialect: postgres) |
| `packages/api/src/index.ts` | Elysia app entry: mounts all module routes, applies middleware, starts server |
| `packages/api/src/db/connection.ts` | Drizzle + postgres.js client connection |
| `packages/api/src/db/schema.ts` | All v1 Drizzle table definitions (users, workspaces, workspace_members, projects, sprints, tasks, audit_logs, employee_capacity) |
| `packages/api/src/db/migrations/` | Auto-generated migration files (via `drizzle-kit generate`) |
| `packages/api/src/modules/auth/auth.route.ts` | Auth endpoints: POST /auth/login, GET /auth/callback, GET /auth/session, POST /auth/logout |
| `packages/api/src/modules/auth/auth.service.ts` | WorkOS integration: initiate OAuth, exchange code, manage sessions |
| `packages/api/src/modules/auth/auth.schema.ts` | Elysia t.Body/t.Query validation schemas |
| `packages/api/src/modules/auth/auth.type.ts` | Module-specific types |
| `packages/api/src/shared/middleware/auth-guard.ts` | Elysia middleware: validates session cookie, attaches user to context |
| `packages/api/src/openapi.ts` | Swagger plugin config (generate OpenAPI spec) |
| `packages/web/package.json` | SvelteKit frontend dependencies |
| `packages/web/svelte.config.js` | SvelteKit config (adapter, alias) |
| `packages/web/src/app.html` | Base HTML template |
| `packages/web/src/app.css` | Global styles, CSS variables, reset |
| `packages/web/src/hooks.server.ts` | Server hook: attach Eden client, verify auth on protected routes |
| `packages/web/src/lib/eden.ts` | Eden Treaty client import from api package: `edenTreaty<App>(url)` |
| `packages/web/src/lib/stores/auth.ts` | Svelte store: currentUser, session, isAuthenticated |
| `packages/web/src/routes/+layout.svelte` | Root layout (minimal) |
| `packages/web/src/routes/auth/login/+page.svelte` | Login page: "Sign in with WorkOS" button |
| `packages/web/src/routes/auth/callback/+page.svelte` | Callback handler: exchange code, set session, redirect to /home |
| `packages/web/src/routes/auth/logout/+page.svelte` | Logout handler: clear session, redirect to login |
| `packages/web/src/routes/(app)/+layout.svelte` | Authenticated layout: sidebar + top bar + `<slot/>` |
| `packages/web/src/routes/(app)/home/+page.svelte` | Home page stub (empty state message — populated in Phase 2) |
| `packages/web/src/routes/(app)/velocity/+page.svelte` | Velocity page stub (Phase 4) |
| `packages/web/src/routes/(app)/projects/+page.svelte` | Projects page stub (Phase 2) |
| `packages/shared/package.json` | Shared package config |
| `packages/shared/src/index.ts` | Re-export common types: Workspace, Project, Task, Sprint, User, etc. |

### Modified Files

None — this is a greenfield phase.

### Deleted Files

None.

## Implementation Details

### 1. Monorepo Scaffold

**Overview**: Create the Bun workspace structure with root-level scripts and package configuration.

```typescript
// Root package.json scripts
{
  "scripts": {
    "dev": "bun run --filter web dev & bun run --filter api dev",
    "build": "bun run --filter '*' build",
    "db:generate": "bun run --filter api db:generate",
    "db:migrate": "bun run --filter api db:migrate",
    "db:seed": "bun run --filter api db:seed"
  }
}
```

**Implementation steps**:
1. Initialize root `package.json` with name `"saha"`, private: true
2. Create `bun-workspaces.yaml` listing `packages/web`, `packages/api`, `packages/shared`
3. Scaffold each package with minimal `package.json` and `tsconfig.json`
4. Install dependencies: `sveltekit`, `elysia`, `drizzle-orm`, `drizzle-kit`, `@elysiajs/eden`, `@elysiajs/swagger`, `@workos-inc/node`, `postgres`

### 2. Database Schema (Drizzle)

**Pattern to follow**: Standard Drizzle ORM schema patterns

**Overview**: Define all v1 tables. This schema is comprehensive — it covers all four phases even though Phase 1 only uses auth and workspace tables.

**Implementation steps**:
1. Define `users` table: id (uuid PK default), email (unique text), name (text), avatarUrl (text?), timestamps
2. Define `workspaces` table: id, name, slug (unique), type (text: 'personal' | 'company'), companyId (text?, nullable — WorkOS org ID), createdBy (→ users.id), timestamps
3. Define `workspace_members` table: id, workspaceId (→ workspaces.id), userId (→ users.id), role (text), joinedAt
4. Define `projects` table: id, workspaceId (→ workspaces.id), name, description?, color?, timestamps
5. Define `sprints` table: id, projectId (→ projects.id), name, goal?, startDate, endDate, status (text: 'planned'|'active'|'completed'), plannedPoints (decimal?), timestamps
6. Define `tasks` table: id, projectId (→ projects.id), title, description?, status (text: 'todo'|'in_progress'|'review'|'done'), priority? (text), storyPoints? (decimal), estimatedHours? (decimal), actualHours? (decimal), assigneeId? (→ users.id), dueDate? (timestamp), deadline? (timestamp), sprintId? (→ sprints.id), sprintFlag? (text), order (integer), completedAt? (timestamp), timestamps
7. Define `audit_logs` table: id, entityType (text), entityId (uuid), action (text), field? (text), oldValue? (text), newValue? (text), userId (→ users.id), createdAt
8. Define `employee_capacity` table: id, sprintId (→ sprints.id), userId (→ users.id), capacityHours (decimal), note? (text), timestamps
9. Run `drizzle-kit generate` to create migrations
10. Apply migrations: `bun db:migrate`

**Feedback loop**:
- **Playground**: Run `bun db:generate` after schema changes, verify no errors
- **Experiment**: Run `bun db:migrate`, connect to Postgres, verify all tables exist with correct columns
- **Check command**: `bun db:generate && bun db:migrate`

### 3. Auth Module (Elysia)

**Pattern to follow**: Elysia plugin/route patterns

**Overview**: WorkOS OAuth flow. Login redirects to WorkOS, callback exchanges code for session, auth-guard middleware validates on protected routes.

```typescript
// auth.route.ts
const authRoutes = new Elysia({ prefix: '/auth' })
  .get('/login', ({ redirect }) => {
    const url = workos.userManagement.getAuthorizationUrl({
      provider: 'authkit',
      redirectUri: `${BASE_URL}/auth/callback`,
    })
    return redirect(url)
  })
  .get('/callback', async ({ query, set, cookie }) => {
    const { user, accessToken } = await workos.userManagement.authenticateWithCode({
      code: query.code,
    })
    // Upsert user in DB
    // On first login: create personal workspace
    // Set httpOnly session cookie
    return { success: true }
  })
  .get('/session', async ({ user }) => {
    return { user }
  })
  .post('/logout', ({ cookie }) => {
    cookie.session.remove()
    return { success: true }
  })
```

**Key decisions**:
- Session stored as httpOnly cookie (not localStorage) for security
- On first login: auto-create user + personal workspace in a transaction
- WorkOS organization membership = company workspace membership (deferred to Phase 2)

**Implementation steps**:
1. Set up WorkOS client with API key + client ID from env
2. Implement login route (redirect to WorkOS AuthKit)
3. Implement callback route (exchange code, upsert user, create personal workspace on first login)
4. Implement session route (return current user from cookie)
5. Implement logout route

**Feedback loop**:
- **Playground**: Start API server (`bun dev`), test auth endpoints with curl
- **Experiment**: GET /auth/login → should redirect (302), mock callback with test code, verify session cookie set
- **Check command**: `bun run --filter api test`

### 4. Auth Guard Middleware

**Overview**: Global middleware applied to all routes except auth endpoints. Validates session cookie exists and contains valid user ID.

```typescript
// shared/middleware/auth-guard.ts
export const authGuard = new Elysia()
  .derive(async ({ cookie, set }) => {
    const sessionToken = cookie.session?.value
    if (!sessionToken) {
      set.status = 401
      throw new Error('Unauthorized')
    }
    const user = await db.query.users.findFirst({
      where: eq(users.id, sessionToken)
    })
    if (!user) {
      set.status = 401
      throw new Error('Unauthorized')
    }
    return { user }
  })
```

**Implementation steps**:
1. Create derive-based middleware that reads session cookie
2. Look up user in DB by session token (user ID stored in cookie)
3. Reject with 401 if invalid
4. Apply globally in Elysia app excluding auth routes

### 5. SvelteKit Layout Shell

**Overview**: Authenticated layout with privacy-safe sidebar and top bar. The sidebar is structural — it never receives workspace data, it only has hardcoded generic labels.

```
┌──────────────────────────────────────────────────┐
│ [Saha logo]    [Workspaces ▼]  [  ] [🔔] [ 🔍 ] │ ← Top bar
├────────┬─────────────────────────────────────────┤
│ 🏠 Home │                                         │
│ 📊 Vel. │        <slot /> (page content)         │
│ 📋 Proj.│                                         │
│         │                                         │
│         │                                         │
│         │                                         │
└─────────┴─────────────────────────────────────────┘
```

**Implementation steps**:
1. Create `(app)/+layout.svelte` with flex layout (sidebar + main)
2. Sidebar: three nav items with icons — Home (→ /home), Velocity (→ /velocity), Projects (→ /projects)
3. Top bar: Saha logo/brand, workspace filter button (placeholder with dropdown slot), empty slots for notification bell and search
4. Apply responsive CSS: sidebar collapses to icon-only at mobile widths

**Feedback loop**:
- **Playground**: Start dev server (`bun dev`), navigate to /home
- **Experiment**: Resize viewport 360px–2560px, verify layout adapts, verify sidebar has exactly 3 items with no workspace names
- **Check command**: `bun run --filter web check` (type checking)

### 6. SvelteKit Auth Integration

**Overview**: Server hooks verify auth status. Login page renders sign-in button. Callback page processes OAuth exchange via the API. Logout clears session.

**Implementation steps**:
1. `hooks.server.ts`: on protected routes, check session cookie exists; if not, redirect to /auth/login; if valid, attach user to event.locals
2. `auth/login/+page.svelte`: "Sign in with WorkOS" button → redirects to /api/auth/login (which redirects to WorkOS)
3. `auth/callback/+page.svelte`: on mount, call API /auth/callback with query code → set session → redirect to /home
4. `auth/logout/+page.svelte`: call API /auth/logout → clear client state → redirect to /auth/login

### 7. Eden Treaty Bridge

**Overview**: SvelteKit imports type-safe API client directly from the Elysia app type.

```typescript
// packages/web/src/lib/eden.ts
import { edenTreaty } from '@elysiajs/eden'
import type { App } from 'api'

export const api = edenTreaty<App>(process.env.API_URL || 'http://localhost:3000')
```

**Implementation steps**:
1. Export `App` type from `packages/api/src/index.ts` (`export type App = typeof app`)
2. Import and configure Eden Treaty in `packages/web/src/lib/eden.ts`
3. Verify type safety: calling `api.auth.session.get()` returns typed response

## Data Model

All tables defined in `packages/api/src/db/schema.ts`. See PRD Phase 1 Section `FR-1.7` for the complete schema reference. Key indexes:

```sql
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_sprint ON tasks(sprint_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_completed_at ON tasks(completed_at);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_sprints_project ON sprints(project_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_employee_capacity_sprint ON employee_capacity(sprint_id, user_id);
```

## API Design

| Method | Path | Description |
|---|---|---|
| `GET` | `/auth/login` | Redirect to WorkOS OAuth |
| `GET` | `/auth/callback` | Exchange OAuth code, create session |
| `GET` | `/auth/session` | Return current user from session |
| `POST` | `/auth/logout` | Clear session cookie |

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|---|---|
| `packages/api/src/modules/auth/auth.service.spec.ts` | WorkOS integration: login URL generation, code exchange |
| `packages/api/src/shared/middleware/auth-guard.spec.ts` | Middleware: valid session, missing cookie, invalid user |

**Key test cases**:
- Auth service generates correct WorkOS authorization URL
- Callback creates user when email not in DB
- Callback returns existing user when email already in DB
- First login auto-creates personal workspace
- Auth guard returns 401 with no cookie
- Auth guard returns 401 with invalid user ID
- Auth guard attaches user to context with valid session

### Manual Testing

- [ ] Click "Sign in with WorkOS" → redirected to WorkOS
- [ ] Complete OAuth → redirected back to /home
- [ ] Refresh page → stays authenticated
- [ ] Logout → redirected to login
- [ ] Visit /home directly when logged out → redirected to login
- [ ] Sidebar shows exactly 3 items with no workspace names

## Error Handling

| Error Scenario | Handling Strategy |
|---|---|
| WorkOS API down | Return 502, show "Authentication service unavailable" |
| Invalid OAuth code | Return 400, show "Invalid authentication code" |
| Database connection failure | Return 503, show "Service temporarily unavailable" |
| Duplicate email during user creation | Return 409, treat as existing user (idempotent) |
| Missing session cookie | Auth guard returns 401, SvelteKit redirects to login |

## Failure Modes

| Component | Failure Mode | Trigger | Impact | Mitigation |
|---|---|---|---|---|
| WorkOS Callback | Stale OAuth code | User waits >10min after redirect before completing auth | Callback returns 400, user must restart login | Set short OAuth code expiry; show clear error message with retry link |
| Personal Workspace | Duplicate creation | Race condition: two concurrent first-login callbacks | Two personal workspaces created | Use upsert with unique constraint on (createdBy, type='personal') |
| Auth Guard | Session cookie tampered | Attacker modifies cookie value | Invalid user ID lookup returns null, rejected with 401 | Store opaque token, not raw UUID; validate format before DB query |
| Schema Migration | Migration conflicts | Multiple devs generate overlapping migrations | Migration failure on apply | Generate sequentially; review migration files before applying |

## Validation Commands

```bash
# Type checking
bun run --filter '*' typecheck

# API tests
bun run --filter api test

# Frontend check
bun run --filter web check

# Database migration (verify it applies cleanly)
bun db:migrate

# Dev server (both frontend + backend)
bun dev
```

## Open Items

- [ ] Set up actual WorkOS application (API key, client ID, redirect URIs)
- [ ] Set up PostgreSQL database (local dev + production)
- [ ] Configure environment variables (.env for API: DATABASE_URL, WORKOS_API_KEY, WORKOS_CLIENT_ID)

---

_This spec is ready for implementation. Follow the patterns and validate at each step._
