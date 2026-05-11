# Context Map: Phase 2 Implementation

**Generated**: 2025-01-11
**Confidence Score**: 85/100

## Key Patterns

### Backend Module Structure
Every domain module follows this pattern:
- `packages/api/src/modules/{domain}/{domain}.route.ts` — Elysia routes with validation schemas
- `packages/api/src/modules/{domain}/{domain}.service.ts` — Business logic, DB queries
- `packages/api/src/modules/{domain}/{domain}.schema.ts` — Elysia validation schemas (t.Object)
- `packages/api/src/modules/{domain}/{domain}.type.ts` — TypeScript types (avoid, prefer shared)

Reference: `packages/api/src/modules/auth/auth.route.ts`, `auth.service.ts`, `auth.schema.ts`

### Route Handler Pattern
```typescript
// route.ts
import { Elysia, t } from 'elysia'
import { someService } from './some.service'

export const someRoutes = new Elysia({ prefix: '/some' })
  .get('/', ({ query, user }) => someService.list(query, user.id))
  .post('/', ({ body, user }) => someService.create(body, user.id))
```

The `user` property is attached by `auth-guard.ts` middleware. All protected routes inherit from the main app which uses the guard.

### Frontend Store Pattern
Svelte stores in `packages/web/src/lib/stores/`:
```typescript
// stores/something.ts
import { writable, derived } from 'svelte/store'
import { api } from '$lib/eden'

export const items = writable<Item[]>([])
export const isLoading = writable(false)

export async function fetchItems() {
  isLoading.set(true)
  const { data, error } = await api.items.get()
  if (!error) items.set(data)
  isLoading.set(false)
}
```

Reference: `packages/web/src/lib/stores/auth.ts`

### Eden Treaty API Client
Typed API calls via Eden Treaty:
```typescript
// In Svelte component or .ts file
import { api } from '$lib/eden'

const { data, error } = await api.tasks.get({ workspaceIds: ['...'] })
```

Reference: `packages/web/src/lib/eden.ts`

## Database Patterns

### Insert Pattern
```typescript
const [newTask] = await db.insert(tasks).values({
  projectId,
  title,
  status: 'todo',
}).returning()
```

### Query with Relations
```typescript
const result = await db.query.workspaceMembers.findMany({
  where: eq(workspaceMembers.userId, userId),
  with: { workspace: true }
})
```

### Using `eq` from drizzle-orm
All conditions use `eq`, `and`, `or` from drizzle-orm. Import: `import { eq, and } from 'drizzle-orm'`

## Dependencies

### Phase 2 Depends On
- `statusChangedAt` column must be added to `tasks` table (migration)
- `isInbox` column must be added to `projects` table (migration)
- `audit_logs` table already exists from Phase 1 schema

### New Tables Required
None — all tables exist from Phase 1.

### API Mount Points
`packages/api/src/index.ts` must mount new routes:
```typescript
.use(workspaceRoutes)
.use(projectRoutes)
.use(taskRoutes)
```

## Conventions

### Naming
- **Files**: kebab-case (`task.service.ts`, `nlp-parser.ts`)
- **Types**: PascalCase (`Task`, `ParsedTaskInput`)
- **Functions**: camelCase (`parseTaskInput`, `createAuditLog`)
- **Endpoints**: REST conventions (`GET /tasks`, `POST /tasks/:id/status`)

### Error Handling
Return `{ error: 'Message' }` with appropriate status code. Elysia's validation handles schema errors automatically.

### Testing
- Unit tests: `*.spec.ts` next to implementation file
- Integration tests: `*.integration.spec.ts` for full lifecycle tests
- Test command: `bun run --filter api test -- {pattern}`

## Risks

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