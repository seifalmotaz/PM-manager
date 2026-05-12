# Implementation Spec: Saha - Phase 1

**Contract**: ./contract.md
**PRD**: ./prd-phase-1.md
**Estimated Effort**: M

## Technical Approach

Phase 1 establishes the full technical foundation. We scaffold a Bun monorepo with three packages: `web` (SvelteKit 5), `api` (Hono + tRPC), and `shared` (common types). The backend uses Hono as the HTTP server framework with `@hono/trpc-server` to mount the tRPC router. Auth flows through WorkOS AuthKit OAuth — the tRPC context factory extracts the session cookie on every request, and a `protectedProcedure` middleware guards all authenticated operations.

Zod replaces `@sinclair/typebox` for input validation — every tRPC procedure declares its input schema with `z.object()`, `z.string()`, etc. tRPC v11's built-in type inference eliminates the need for a separate OpenAPI/Swagger layer that Elysia required. Type safety propagates end-to-end: tRPC router types are exported as `AppRouter` and consumed on the frontend via `createTRPCClient<AppRouter>`.

The layout shell is minimal: sidebar with three icon-only items (Home, Velocity, Projects), top bar with placeholder slots. No workspace or company names appear — enforced structurally, not by runtime hiding.

On first login, the auth callback creates a user record and auto-creates a personal workspace in a transaction. Session tokens are httpOnly cookies — the tRPC context factory reads them and the `protectedProcedure` middleware rejects with `TRPCError({ code: 'UNAUTHORIZED' })` if absent or invalid.

## Feedback Strategy

**Inner-loop command**: `bun run --filter api test`

**Playground**: Test suite for tRPC procedures and auth service. SvelteKit dev server for layout verification.

**Why this approach**: Phase 1 is infrastructure-heavy — auth, schema, routing. Tests validate auth flow and database schema deterministically. The dev server validates layout rendering.

## File Changes

### New Files

| File Path | Purpose |
|---|---|
| `package.json` | Root monorepo with workspace scripts (`dev`, `build`, `db:generate`, `db:migrate`, `db:seed`) |
| `packages/api/package.json` | Hono + tRPC + Drizzle dependencies |
| `packages/api/tsconfig.json` | API TypeScript config |
| `packages/api/drizzle.config.ts` | Drizzle configuration (schema path, migrations dir, dialect: postgres) |
| `packages/api/src/index.ts` | Hono app entry: mounts tRPC handler, CORS, starts server |
| `packages/api/src/trpc.ts` | tRPC initialization: context factory, procedure factories, auth middleware |
| `packages/api/src/router.ts` | Root tRPC router: merges all domain routers |
| `packages/api/src/db/connection.ts` | Drizzle + postgres.js client connection |
| `packages/api/src/db/schema.ts` | All v1 Drizzle table definitions (users, workspaces, workspace_members, projects, sprints, tasks, audit_logs, employee_capacity) |
| `packages/api/src/db/migrations/` | Auto-generated migration files |
| `packages/api/src/modules/auth/auth.router.ts` | Auth tRPC router: loginUrl, callback, session, logout |
| `packages/api/src/modules/auth/auth.service.ts` | WorkOS integration: initiate OAuth, exchange code, manage sessions |
| `packages/api/src/modules/auth/auth.schema.ts` | Zod validation schemas |
| `packages/api/src/modules/auth/auth.type.ts` | Module-specific types |
| `packages/web/package.json` | SvelteKit + tRPC client dependencies |
| `packages/web/svelte.config.js` | SvelteKit config (adapter, alias) |
| `packages/web/tsconfig.json` | Frontend TypeScript config |
| `packages/web/src/app.html` | Base HTML template |
| `packages/web/src/app.css` | Global styles, CSS variables, reset |
| `packages/web/src/hooks.server.ts` | Server hook: verify auth on protected routes, redirect to login |
| `packages/web/src/lib/trpc.ts` | tRPC client: `createTRPCClient<AppRouter>` with `httpBatchLink` |
| `packages/web/src/lib/stores/auth.ts` | Svelte store: currentUser, session, isAuthenticated |
| `packages/web/src/routes/+layout.svelte` | Root layout (minimal) |
| `packages/web/src/routes/auth/login/+page.svelte` | Login page: "Sign in with WorkOS" button |
| `packages/web/src/routes/auth/callback/+page.svelte` | Callback handler: exchange code, redirect to /home |
| `packages/web/src/routes/auth/logout/+page.svelte` | Logout handler: clear session, redirect to login |
| `packages/web/src/routes/(app)/+layout.svelte` | Authenticated layout: sidebar + top bar + `<slot/>` |
| `packages/web/src/routes/(app)/home/+page.svelte` | Home page stub (empty state message — populated in Phase 2) |
| `packages/web/src/routes/(app)/velocity/+page.svelte` | Velocity page stub (Phase 4) |
| `packages/web/src/routes/(app)/projects/+page.svelte` | Projects page stub (Phase 2) |
| `packages/shared/package.json` | Shared package config |
| `packages/shared/tsconfig.json` | Shared TypeScript config |
| `packages/shared/src/index.ts` | Re-export common types: User, Workspace, Project, Task, Sprint, etc. |

### Modified Files

None — this is a greenfield phase.

### Deleted Files

None.

## Implementation Details

### 1. Monorepo Scaffold

**Overview**: Create the Bun workspace structure with root-level scripts and per-package configuration.

```json
// Root package.json scripts
{
  "scripts": {
    "dev": "bun --env-file=.env run --filter web dev & bun --env-file=.env run --filter api dev",
    "build": "bun --env-file=.env run --filter '*' build",
    "db:generate": "bun --env-file=.env run --filter api db:generate",
    "db:migrate": "bun --env-file=.env run --filter api db:migrate",
    "db:seed": "bun --env-file=.env run --filter api db:seed",
    "typecheck": "bun run --filter '*' typecheck"
  }
}
```

**Implementation steps**:
1. Initialize root `package.json` with name `"saha"`, private: true, workspaces: `["packages/shared", "packages/api", "packages/web"]`
2. Scaffold each package with minimal `package.json` and `tsconfig.json`
3. Install core dependencies: `hono`, `@trpc/server`, `@trpc/client`, `@hono/trpc-server`, `zod`, `drizzle-orm`, `drizzle-kit`, `@workos-inc/node`, `postgres`
4. Install dev dependencies: `svelte`, `@sveltejs/kit`, `typescript`, `@types/bun`

### 2. Hono + tRPC Server Setup

**Overview**: The Hono app mounts tRPC at `/trpc/*` using `@hono/trpc-server`. The tRPC adapter passes `{ req, resHeaders }` to the context factory so cookies can be read and set.

```typescript
// packages/api/src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { trpcServer } from '@hono/trpc-server'
import { appRouter } from './router'
import { createContext } from './trpc'

const app = new Hono()

app.use('/*', cors({
  origin: ['http://localhost:5173'],
  credentials: true,
}))

app.use('/trpc/*', trpcServer({ router: appRouter, createContext }))

export default {
  port: 3000,
  fetch: app.fetch,
}

export type AppRouter = typeof appRouter
```

**Key decisions**:
- CORS must allow credentials for httpOnly cookie transmission
- tRPC mounts at `/trpc/*` — all procedures go through the single `/trpc` HTTP endpoint
- `AppRouter` type export enables end-to-end type safety without code generation

**Implementation steps**:
1. Create `src/index.ts` with Hono app init
2. Configure CORS for the SvelteKit dev origin
3. Mount tRPC handler on `/trpc/*`
4. Export `AppRouter` type
5. Export `default` with port and fetch for Bun's serve

**Feedback loop**:
- **Playground**: Start API with `bun run --filter api dev`
- **Experiment**: `curl http://localhost:3000/trpc/auth.loginUrl` — should return JSON (not an error about missing body)
- **Check command**: `bun run --filter api dev`

### 3. tRPC Context & Middleware

**Overview**: The context factory reads the session cookie, validates the user, and returns `{ user, db, req, resHeaders }`. The `protectedProcedure` middleware throws `UNAUTHORIZED` when `user` is null.

```typescript
// packages/api/src/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { db } from './db/connection'
import type { InferContext } from '@trpc/server'

export async function createContext(opts: { req: Request; resHeaders: Headers }) {
  // Hono's trpcServer adapter provides { req, resHeaders }
  const sessionToken = getCookie(opts.req as any, 'session')
  let user = null

  if (sessionToken) {
    const { users } = await import('./db/schema')
    const { eq } = await import('drizzle-orm')
    const result = await db.select().from(users).where(eq(users.id, sessionToken)).limit(1)
    user = result[0] || null
  }

  return {
    user,
    db,
    req: opts.req,
    resHeaders: opts.resHeaders,
  }
}

export type Context = InferContext<typeof createContext>

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' })
    }
    return next({
      ctx: {
        user: ctx.user,
      },
    })
  }),
)
```

**Key decisions**:
- Context factory is async — it queries the database to validate the session
- `resHeaders` is available for cookie manipulation after tRPC handler completes (set/delete session cookie)
- `user` is narrowed to non-null through the middleware, so all protected procedures get `ctx.user` typed as `User`

**Implementation steps**:
1. Create `src/trpc.ts` with context factory
2. Implement session reading via `getCookie` from `hono/cookie`
3. Query database for user by session token
4. Define `protectedProcedure` middleware that throws on null user
5. Export `router`, `publicProcedure`, `protectedProcedure`, and `Context` type

**Feedback loop**:
- **Playground**: Integration test with seeded user
- **Experiment**: Call a protected procedure with no cookie → expect `UNAUTHORIZED`. Call with valid cookie → expect success.
- **Check command**: `bun run --filter api test -- trpc`

### 4. Database Schema (Drizzle)

**Pattern to follow**: Standard Drizzle ORM patterns with postgres.js driver

**Overview**: Define all v1 tables. This schema covers all four phases even though Phase 1 only uses auth and workspace tables.

**Implementation steps**:
1. Define `users` table: id (uuid PK, defaultRandom), email (text, unique, notNull), name (text, notNull), avatarUrl (text), createdAt (timestamp, defaultNow), updatedAt (timestamp, defaultNow)
2. Define `workspaces` table: id (uuid PK), name (text, notNull), slug (text, unique, notNull), type (text: 'personal' | 'company', notNull), companyId (text, nullable — WorkOS org ID), createdBy (uuid, references users.id), createdAt, updatedAt
3. Define `workspace_members` table: id (uuid PK), workspaceId (uuid, references workspaces.id, onDelete cascade, notNull), userId (uuid, references users.id, onDelete cascade, notNull), role (text: 'owner' | 'admin' | 'member', default 'member'), joinedAt (timestamp, defaultNow)
4. Define `projects` table: id (uuid PK), workspaceId (uuid, references workspaces.id, onDelete cascade, notNull), name (text, notNull), description (text), color (text, hex), isInbox (boolean, default false), createdAt, updatedAt
5. Define `sprints` table: id (uuid PK), projectId (uuid, references projects.id, onDelete cascade, notNull), name (text, notNull), goal (text), startDate (timestamp, notNull), endDate (timestamp, notNull), status (text: 'planned' | 'active' | 'completed', default 'planned'), plannedPoints (decimal), createdAt, updatedAt
6. Define `tasks` table: id (uuid PK), projectId (uuid, references projects.id, onDelete cascade, notNull), title (text, notNull), description (text), status (text: 'todo' | 'in_progress' | 'review' | 'done', default 'todo'), priority (text: 'p0' | 'p1' | 'p2' | 'p3'), storyPoints (decimal), estimatedHours (decimal), assigneeId (uuid, references users.id), dueDate (timestamp), deadline (timestamp), sprintId (uuid, references sprints.id), sprintFlag (text), statusChangedAt (timestamp, defaultNow), startedAt (timestamp), completedAt (timestamp), createdAt, updatedAt
7. Define `audit_logs` table: id (uuid PK), entityType (text, notNull), entityId (uuid, notNull), action (text, notNull), field (text), oldValue (text), newValue (text), userId (uuid, references users.id, notNull), createdAt (timestamp, defaultNow)
8. Define `employee_capacity` table: id (uuid PK), sprintId (uuid, references sprints.id, onDelete cascade, notNull), userId (uuid, references users.id, onDelete cascade, notNull), capacityHours (decimal, notNull), note (text), createdAt, updatedAt
9. Run `bun db:generate` to create migrations
10. Apply migrations: `bun db:migrate`

**Feedback loop**:
- **Playground**: Postgres database (local)
- **Experiment**: Run `bun db:generate && bun db:migrate`, connect to Postgres, verify all 8 tables exist with correct columns
- **Check command**: `bun db:generate && bun db:migrate`

### 5. Auth tRPC Router

**Overview**: tRPC procedures for WorkOS OAuth flow. The `loginUrl` query returns the authorization URL. `callback` mutation exchanges the OAuth code and sets the session cookie. `session` query returns the current user. `logout` mutation clears the session.

```typescript
// packages/api/src/modules/auth/auth.router.ts
import { z } from 'zod'
import { setCookie, deleteCookie } from 'hono/cookie'
import { router, publicProcedure, protectedProcedure } from '../../trpc'
import { authService } from './auth.service'

export const authRouter = router({
  loginUrl: publicProcedure.query(() => {
    const url = authService.getAuthorizationUrl()
    return { url }
  }),

  callback: publicProcedure
    .input(z.object({ code: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const { user, isNew } = await authService.exchangeCode(input.code)

      // Set session cookie: store user ID as session token
      setCookie(ctx.req as any, ctx.resHeaders as any, 'session', user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })

      return { user, isNew }
    }),

  session: protectedProcedure.query(({ ctx }) => {
    // Exclude sensitive fields
    const { id, email, name, avatarUrl } = ctx.user
    return { user: { id, email, name, avatarUrl } }
  }),

  logout: publicProcedure.mutation(({ ctx }) => {
    deleteCookie(ctx.req as any, ctx.resHeaders as any, 'session', { path: '/' })
    return { success: true }
  }),
})
```

**Key decisions**:
- Session stored as httpOnly cookie (not localStorage) for security
- `loginUrl` is a query (GET), not a redirect — the frontend handles the redirect after receiving the URL
- `callback` sets the cookie via Hono's `setCookie` using `resHeaders` from tRPC context
- `logout` does not require auth — it should work even with an expired session
- On first login: `exchangeCode` auto-creates user + personal workspace in a transaction

**Implementation steps**:
1. Create `auth.service.ts` with WorkOS client initialization
2. Implement `getAuthorizationUrl()` — returns WorkOS AuthKit URL
3. Implement `exchangeCode(code)` — calls WorkOS, upserts user, creates personal workspace if new
4. Create `auth.router.ts` with the four procedures
5. Create `auth.schema.ts` with Zod schemas (if needing separation from router)

**Feedback loop**:
- **Playground**: Start API server, mock WorkOS responses
- **Experiment**: Call `auth.loginUrl` → verify URL format. Mock callback with test code → verify user created and session cookie set.
- **Check command**: `bun run --filter api test -- auth`

### 6. Auth Service

```typescript
// packages/api/src/modules/auth/auth.service.ts
import { WorkOS } from '@workos-inc/node'
import { db } from '../../db/connection'
import { users, workspaces, workspaceMembers } from '../../db/schema'
import { eq } from 'drizzle-orm'

const workos = new WorkOS(process.env.WORKOS_API_KEY!, {
  clientId: process.env.WORKOS_CLIENT_ID!,
})

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'

function getAuthorizationUrl(): string {
  return workos.userManagement.getAuthorizationUrl({
    provider: 'authkit',
    redirectUri: `${BASE_URL}/auth/callback`,
    clientId: process.env.WORKOS_CLIENT_ID!,
  })
}

async function exchangeCode(code: string) {
  const { user: workosUser } = await workos.userManagement.authenticateWithCode({
    clientId: process.env.WORKOS_CLIENT_ID!,
    code,
  })

  // Upsert user
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, workosUser.email))
    .limit(1)

  let user: typeof users.$inferSelect
  let isNew = false

  if (existing) {
    // Update existing user
    const [updated] = await db
      .update(users)
      .set({
        name: `${workosUser.firstName} ${workosUser.lastName}`.trim(),
        avatarUrl: workosUser.profilePictureUrl ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id))
      .returning()
    user = updated
  } else {
    // Create new user + personal workspace in transaction
    isNew = true
    user = await db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          email: workosUser.email,
          name: `${workosUser.firstName} ${workosUser.lastName}`.trim(),
          avatarUrl: workosUser.profilePictureUrl ?? undefined,
        })
        .returning()

      // Auto-create personal workspace
      const [personalWorkspace] = await tx
        .insert(workspaces)
        .values({
          name: 'Personal',
          slug: `${newUser.id}-personal`,
          type: 'personal',
          createdBy: newUser.id,
        })
        .returning()

      // Add user as owner member
      await tx.insert(workspaceMembers).values({
        workspaceId: personalWorkspace.id,
        userId: newUser.id,
        role: 'owner',
      })

      return newUser
    })
  }

  return { user, isNew }
}

export const authService = { getAuthorizationUrl, exchangeCode }
```

### 7. Root tRPC Router

```typescript
// packages/api/src/router.ts
import { router } from './trpc'
import { authRouter } from './modules/auth/auth.router'

export const appRouter = router({
  auth: authRouter,
})

export type AppRouter = typeof appRouter
```

### 8. SvelteKit Layout Shell

**Overview**: Authenticated layout with privacy-safe sidebar and top bar.

```
┌──────────────────────────────────────────────────────────┐
│ [Saha]    [Workspaces ▼]          [2 overdue] [ 🔍 ]    │ ← Top bar
├───────────┬──────────────────────────────────────────────┤
│ 🏠 Home    │                                              │
│ 📊 Vel.    │              <slot /> (page content)        │
│ 📋 Proj.   │                                              │
│            │                                              │
└────────────┴──────────────────────────────────────────────┘
```

**Implementation steps**:
1. Create `(app)/+layout.svelte` with CSS grid: `grid-template-columns: auto 1fr; grid-template-rows: auto 1fr`
2. Sidebar: three nav items — Home (→ /home), Velocity (→ /velocity), Projects (→ /projects)
3. Top bar: brand/logo, workspace filter button (placeholder), deadline badge (placeholder), search slot
4. Sidebar collapses to icon-only at breakpoints below 768px
5. Zero hardcoded workspace or company names — sidebar items are static labels

**Feedback loop**:
- **Playground**: Start dev server (`bun dev`), navigate to /home
- **Experiment**: Resize viewport 360px–2560px, verify sidebar has exactly 3 items with no workspace names
- **Check command**: `bun run --filter web check`

### 9. SvelteKit Auth Integration

**Overview**: Server hooks protect routes. Login page initiates OAuth. Callback page exchanges code. Logout clears state.

**Implementation steps**:
1. `hooks.server.ts`:
   - On routes under `/(app)`, verify session cookie exists via tRPC context
   - If invalid, redirect to `/auth/login`
2. `auth/login/+page.svelte`:
   - On mount, call `trpc.auth.loginUrl.query()` then redirect to the returned URL
   - Render a "Sign in with WorkOS" button as fallback
3. `auth/callback/+page.svelte`:
   - On mount, read `?code=` from URL
   - Call `trpc.auth.callback.mutate({ code })`
   - Redirect to `/home` on success
4. `auth/logout/+page.svelte`:
   - On mount, call `trpc.auth.logout.mutate()`
   - Redirect to `/auth/login`

### 10. tRPC Client Setup (Frontend)

```typescript
// packages/web/src/lib/trpc.ts
import type { AppRouter } from 'api'
import { createTRPCClient, httpBatchLink } from '@trpc/client'

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/trpc',
      fetch: (url, options) =>
        fetch(url, {
          ...options,
          credentials: 'include',
        }),
    }),
  ],
})
```

**Key decisions**:
- `credentials: 'include'` sends the httpOnly session cookie on every request
- Development URL is hardcoded to `localhost:3000`; production uses relative `/trpc` path
- `httpBatchLink` batches multiple tRPC calls into a single HTTP request for performance

**Implementation steps**:
1. Import `AppRouter` type from the API package
2. Create `trpc` client with `httpBatchLink`
3. Verify type safety: `trpc.auth.session.query()` resolves to `{ user: {...} }`

## Data Model

All tables defined in `packages/api/src/db/schema.ts`. Key indexes:

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_workspaces_slug ON workspaces(slug);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_projects_workspace ON projects(workspace_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_sprint ON tasks(sprint_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_completed_at ON tasks(completed_at);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_sprints_project ON sprints(project_id);
CREATE INDEX idx_employee_capacity_sprint ON employee_capacity(sprint_id, user_id);
```

## API Design

All endpoints are tRPC procedures accessible via the single `/trpc` HTTP endpoint.

### Auth Router

| Procedure | Type | Access | Description |
|---|---|---|---|
| `auth.loginUrl` | query | public | Returns WorkOS authorization URL |
| `auth.callback` | mutation | public | Exchanges OAuth code, creates session, returns user |
| `auth.session` | query | protected | Returns current authenticated user |
| `auth.logout` | mutation | public | Clears session cookie |

### Procedure Inputs / Outputs

```typescript
// auth.loginUrl
// Input: none
// Output: { url: string }

// auth.callback
// Input: { code: string }
// Output: { user: { id, email, name, avatarUrl }, isNew: boolean }

// auth.session
// Input: none
// Output: { user: { id, email, name, avatarUrl } }

// auth.logout
// Input: none
// Output: { success: true }
```

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|---|---|
| `packages/api/src/modules/auth/auth.service.spec.ts` | WorkOS integration: login URL generation, code exchange |
| `packages/api/src/trpc.spec.ts` | Context and middleware: valid session, missing cookie, invalid user |

**Key test cases**:
- Auth service generates correct WorkOS authorization URL with redirectUri
- `exchangeCode` creates user when email not in DB
- `exchangeCode` returns existing user when email already in DB
- First login auto-creates personal workspace with owner membership
- `protectedProcedure` rejects with `UNAUTHORIZED` when no cookie
- `protectedProcedure` rejects with `UNAUTHORIZED` when invalid user ID
- `protectedProcedure` attaches user to context with valid session

### Manual Testing

- [ ] Click "Sign in with WorkOS" → redirected to WorkOS AuthKit
- [ ] Complete OAuth → redirected back to /home
- [ ] Refresh page → stays authenticated (session cookie persists)
- [ ] Logout → redirected to login page
- [ ] Visit /home directly when logged out → redirected to /auth/login
- [ ] Sidebar shows exactly 3 items: Home, Velocity, Projects (no workspace names)
- [ ] `bun db:migrate` creates all 8 tables in PostgreSQL

## Error Handling

| Error Scenario | Handling Strategy |
|---|---|
| WorkOS API unavailable | Throw `TRPCError({ code: 'SERVICE_UNAVAILABLE' })` |
| Invalid OAuth code | Throw `TRPCError({ code: 'BAD_REQUEST', message: 'Invalid auth code' })` |
| Database connection failure | Throw `TRPCError({ code: 'INTERNAL_SERVER_ERROR' })` |
| Duplicate email on user creation | Transaction handles idempotency — upsert pattern |
| Missing session cookie | `protectedProcedure` throws `TRPCError({ code: 'UNAUTHORIZED' })` |
| Invalid session token (tampered) | Context factory returns null user, middleware rejects |

## Failure Modes

| Component | Failure Mode | Trigger | Impact | Mitigation |
|---|---|---|---|---|
| Auth Callback | Stale OAuth code | User waits >10min between redirect and completing auth | Callback returns 400 | Show clear error with retry link |
| Personal Workspace | Duplicate creation | Race: two concurrent first-login callbacks | Two personal workspaces | Use `createdBy + type='personal'` uniqueness constraint |
| tRPC Context | Session cookie tampered | Attacker modifies cookie value | Invalid user ID lookup, returns null, rejected | Validate format before DB query; use opaque tokens |
| Schema Migration | Migration conflicts | Multiple devs generate overlapping migrations | Migration failure on apply | Generate and review sequentially |
| tRPC Context | DB query slow | Cold start or DB under load | Every request blocked on context | Accept for v1; future: add session cache layer |

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
- [ ] Configure environment variables (.env: DATABASE_URL, WORKOS_API_KEY, WORKOS_CLIENT_ID, BASE_URL)
- [ ] Determine production tRPC URL (dev uses `localhost:3000`, prod needs real URL)

---

_This spec is ready for implementation. Follow the patterns and validate at each step._
