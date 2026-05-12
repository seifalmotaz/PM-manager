# Context Map: Saha Stack (tRPC + Hono + Zod)

**Generated**: 2026-05-12
**Confidence Score**: 95/100

## Key Patterns

### Backend Module Structure
Every domain (workspace, project, task, sprint) gets:
- `packages/api/src/modules/{domain}/{domain}.router.ts` — tRPC router (queries + mutations)
- `packages/api/src/modules/{domain}/{domain}.service.ts` — Business logic, DB queries (unchanged conceptually)
- `packages/api/src/modules/{domain}/{domain}.schema.ts` — Zod schemas (replaces Elysia t.Object)
- `packages/api/src/modules/{domain}/{domain}.type.ts` — TypeScript types (same)

### tRPC Router Pattern
Show the standard tRPC v11 pattern:
```typescript
import { z } from 'zod'
import { router, publicProcedure, protectedProcedure } from '../../trpc'
import { projectService } from './project.service'

export const projectRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid().optional() }))
    .query(({ input, ctx }) => projectService.listByWorkspace(input.workspaceId, ctx.user.id)),
  
  create: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid(), name: z.string().min(1) }))
    .mutation(({ input, ctx }) => projectService.create(input, ctx.user.id)),
})
```

### tRPC Context Pattern
Show how `ctx.user` is passed via tRPC context (extracted from auth middleware in Hono):
```typescript
// trpc.ts
export const createContext = async ({ req }: { req: Request }) => {
  const session = getCookie(req, 'session')
  const user = await validateSession(session)
  return { user, db }
}

export const protectedProcedure = t.procedure.use(
  t.middleware(({ ctx, next }) => {
    if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
    return next({ ctx: { user: ctx.user } })
  })
)
```

### Frontend Store Pattern
Replace Eden Treaty with tRPC client:
```typescript
import { writable } from 'svelte/store'
import { trpc } from '$lib/trpc'

export const projects = writable<Project[]>([])

export async function fetchProjects() {
  const data = await trpc.project.list.query({})
  projects.set(data)
}
```

### tRPC Client Setup
How it's imported in SvelteKit:
```typescript
// packages/web/src/lib/trpc.ts
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from 'api'

export const trpc = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: 'http://localhost:3000/trpc' })]
})
```

### Hono Setup
Show the top-level Hono server mounting:
```typescript
// packages/api/src/index.ts
import { Hono } from 'hono'
import { trpcServer } from '@hono/trpc-server'
import { appRouter } from './router'
import { createContext } from './trpc'

const app = new Hono()
app.use('/trpc/*', trpcServer({ router: appRouter, createContext }))
```

### Database Patterns
Unchanged (still Drizzle ORM with postgres.js)

### Naming conventions
- Files: kebab-case
- tRPC procedures: camelCase
- Endpoints: All go through `/trpc` — no REST-style routes anymore

### Dependencies section
- `@trpc/server`
- `@trpc/client`
- `@hono/trpc-server`
- `hono`
- `zod`

### Risks section
Keep the same project risks but remove Elysia-specific ones:
1. **NLP parser edge cases** — Regex-based parsing can miss edge cases. Test thoroughly with the experiment cases in spec.
2. **Status transition validation** — Must check Sprint end date when reopening from `done`. Requires fetching the task's Sprint (if any).
3. **Assignee resolution** — Case-insensitive username match must query `users` table within workspace membership scope.
4. **Workspace filter in Home endpoint** — Must join through `projects → workspaces → workspace_members` to filter by visible workspaces.
5. **Concurrency on audit logs** — Fire-and-forget pattern. Consider wrapping in try/catch to prevent audit errors from surfacing.
6. **neodrag integration** — New dependency. Test that drag state updates sync with API calls.

## Phase 2 Component Order (Resolved)

Based on dependencies:
1. **NLP Parser** — Independent, pure function, can be tested in isolation
2. **Audit Service** — Depended on by all mutation services
3. **Workspace Module** — Needed by Project/Task modules for validation
4. **Project Module** — Needed by Task module for Inbox creation and filtering
5. **Task Module** — Depends on all above
6. **Sprint Module** — Parallel to Task if CRUD-only
7. **KanbanBoard** — Depends on Task API
8. **TaskModal** — Depends on Task API and Sprint API
9. **WorkspaceFilter** — Depends on Workspace API
10. **Home endpoint + page** — Depends on all above

## Implementation Notes from Grilling Session

See `CONTEXT.md` for resolved ambiguities. Key decisions:
- `statusChangedAt` column added (ADR: 0002)
- Inbox project auto-created per workspace (`isInbox` column)
- Audit logs per changed field
- Status transitions: adjacent only
- Task reopening: only during active Sprint
- NLP date → dueDate (not deadline)
- Assignee: case-insensitive, prefer workspace member
- Home endpoint: `GET /tasks/home`
- NLP creation flow: `/parse` then `/create`