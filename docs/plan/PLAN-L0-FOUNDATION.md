# Saha — Level 0: Foundation

**Version:** 1.0  
**Date:** May 15, 2026  
**Status:** Approved  
**Theme:** Schema, migrations, org architecture. Nothing user-visible yet.

---

## Objective

Build the architectural foundation that all subsequent levels depend on. This includes new database tables, schema changes, WorkOS org integration, and the active-org state management. No user-visible features ship in L0 — it's pure infrastructure.

---

## Database Schema Changes

### 1. New Table: `organization_settings`

Stores Saha-specific configuration per Organization. WorkOS owns org identity; this table stores Saha's internal settings.

```sql
CREATE TABLE organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL UNIQUE,  -- WorkOS org ID
  default_sprint_length_days INTEGER NOT NULL DEFAULT 14,
  working_hours_start TIME NOT NULL DEFAULT '09:00:00',
  working_hours_end TIME NOT NULL DEFAULT '17:00:00',
  working_days INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],  -- Mon=1, Tue=2, ..., Sun=0
  timezone TEXT NOT NULL DEFAULT 'UTC',
  require_clock_in BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_org_settings_org_id ON organization_settings(organization_id);
```

**Fields:**

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `organization_id` | TEXT (PK) | — | WorkOS org ID. Unique. |
| `default_sprint_length_days` | INTEGER | 14 | PM creates sprint → auto-suggests end date. |
| `working_hours_start` | TIME | 09:00 | Org clock-in defaults. |
| `working_hours_end` | TIME | 17:00 | Auto-timeout logic reference. |
| `working_days` | INTEGER[] | [1,2,3,4,5] | Mon–Fri. Sprint duration calculations. |
| `timezone` | TEXT | UTC | Normalizes all timestamps for timesheet aggregation. |
| `require_clock_in` | BOOLEAN | false | Mandatory org clock-in before task status changes? |

**Drizzle ORM Schema:**

```typescript
export const organizationSettings = pgTable('organization_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id').notNull().unique(),
  defaultSprintLengthDays: integer('default_sprint_length_days').notNull().default(14),
  workingHoursStart: time('working_hours_start').notNull().default('09:00:00'),
  workingHoursEnd: time('working_hours_end').notNull().default('17:00:00'),
  workingDays: integer('working_days').array().notNull().default([1, 2, 3, 4, 5]),
  timezone: text('timezone').notNull().default('UTC'),
  requireClockIn: boolean('require_clock_in').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

---

### 2. New Table: `org_sessions`

Replaces `timeEntries`. Tracks org-level clock-in/out sessions with auto-enriched task completion data.

```sql
CREATE TABLE org_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL,  -- WorkOS org ID
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,  -- NULL while session is live
  note TEXT,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  story_points_completed DECIMAL NOT NULL DEFAULT 0,
  estimated_hours_sum DECIMAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_org_sessions_user ON org_sessions(user_id);
CREATE INDEX idx_org_sessions_org ON org_sessions(organization_id);
CREATE INDEX idx_org_sessions_time ON org_sessions(start_time, end_time);
CREATE INDEX idx_org_sessions_user_org_time ON org_sessions(user_id, organization_id, start_time);
```

**Fields:**

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `id` | UUID | System | Primary key |
| `user_id` | UUID FK → users | Auth context | Who clocked in |
| `organization_id` | TEXT (WorkOS org ID) | Auth context | Which org |
| `start_time` | TIMESTAMP | User action | Clock-in moment |
| `end_time` | TIMESTAMP | User action or auto-timeout | Clock-out. NULL while live. |
| `note` | TEXT | User (optional) | "Morning was dev work, afternoon was interviews" |
| `tasks_completed` | INTEGER | Auto-enriched on clock-out | COUNT of tasks completed during session |
| `story_points_completed` | DECIMAL | Auto-enriched on clock-out | SUM of storyPoints for completed tasks |
| `estimated_hours_sum` | DECIMAL | Auto-enriched on clock-out | SUM of estimatedHours for completed tasks |

**Auto-Enrichment Logic (on clock-out):**

```sql
-- Pseudo-SQL for auto-enrichment on session end:
UPDATE org_sessions SET
  tasks_completed = (
    SELECT COUNT(*) FROM tasks
    WHERE completed_at BETWEEN start_time AND end_time
      AND assignee_id = org_sessions.user_id
      AND status = 'done'
  ),
  story_points_completed = (
    SELECT COALESCE(SUM(story_points), 0) FROM tasks
    WHERE completed_at BETWEEN start_time AND end_time
      AND assignee_id = org_sessions.user_id
      AND status = 'done'
  ),
  estimated_hours_sum = (
    SELECT COALESCE(SUM(estimated_hours), 0) FROM tasks
    WHERE completed_at BETWEEN start_time AND end_time
      AND assignee_id = org_sessions.user_id
      AND status = 'done'
  )
WHERE id = :session_id;
```

**Drizzle ORM Schema:**

```typescript
export const orgSessions = pgTable('org_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: text('organization_id').notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  note: text('note'),
  tasksCompleted: integer('tasks_completed').notNull().default(0),
  storyPointsCompleted: decimal('story_points_completed').notNull().default('0'),
  estimatedHoursSum: decimal('estimated_hours_sum').notNull().default('0'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdx: index('idx_org_sessions_user').on(table.userId),
  orgIdx: index('idx_org_sessions_org').on(table.organizationId),
  timeIdx: index('idx_org_sessions_time').on(table.startTime, table.endTime),
  userOrgTimeIdx: index('idx_org_sessions_user_org_time').on(table.userId, table.organizationId, table.startTime),
}))
```

---

### 3. Drop Table: `timeEntries`

The existing `timeEntries` table and all associated router endpoints are removed.

```sql
DROP TABLE IF EXISTS time_entries CASCADE;
```

**Removed Router Endpoints:**
- `timeEntry.list`
- `timeEntry.running`
- `timeEntry.start`
- `timeEntry.stop`
- `timeEntry.create`
- `timeEntry.update`
- `timeEntry.delete`

**Removed Frontend Components:**
- `TimeTracker.svelte` (replaced by org clock-in component)
- `TimeEntryForm.svelte` (unused component, no longer needed)

---

### 4. Schema Additions to Existing Tables

#### 4.1 `tasks` Table — Add `order` Column

Per CONTEXT.md line 101: "keep `order` column for future manual reorder."

```sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX idx_tasks_order ON tasks(project_id, status, "order");
```

#### 4.2 `workspace_members` Table — Add Unique Constraint

```sql
ALTER TABLE workspace_members
  ADD CONSTRAINT unique_workspace_member UNIQUE (workspace_id, user_id);
```

#### 4.3 `tasks` Table — Add Index on `assigneeId`

```sql
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
```

---

## Migration Plan

### Migration File: `0003_org_sessions_and_settings.sql`

```sql
-- Step 1: Create new tables
CREATE TABLE organization_settings (...);
CREATE TABLE org_sessions (...);

-- Step 2: Add columns to existing tables
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;

-- Step 3: Add indexes
CREATE INDEX idx_org_settings_org_id ON organization_settings(organization_id);
CREATE INDEX idx_org_sessions_user ON org_sessions(user_id);
CREATE INDEX idx_org_sessions_org ON org_sessions(organization_id);
CREATE INDEX idx_org_sessions_time ON org_sessions(start_time, end_time);
CREATE INDEX idx_org_sessions_user_org_time ON org_sessions(user_id, organization_id, start_time);
CREATE INDEX idx_tasks_order ON tasks(project_id, status, "order");
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);

-- Step 4: Add unique constraint
ALTER TABLE workspace_members
  ADD CONSTRAINT unique_workspace_member UNIQUE (workspace_id, user_id);

-- Step 5: Drop old table
DROP TABLE IF EXISTS time_entries CASCADE;
```

---

## WorkOS Integration

### Organization Resolution

WorkOS owns org identity. Saha resolves `organizationId` from the authenticated user's active WorkOS organization context.

**Auth Flow:**
1. User authenticates via WorkOS → receives access token + active org ID
2. Saha stores the active org ID in the session cookie
3. Every API request includes the org ID in the session
4. Middleware validates user is a member of the org (via WorkOS API or cached membership)

### Active-Org State (Frontend)

```typescript
// /packages/web/src/lib/stores/active-org.svelte.ts
import { writable } from 'svelte/store'

export const activeOrg = writable<{
  id: string        // WorkOS org ID
  name: string      // Org display name
  slug: string      // URL-friendly slug
} | null>(null)

export function setActiveOrg(org: { id: string; name: string; slug: string }) {
  activeOrg.set(org)
  // Persist to localStorage for session recovery
  localStorage.setItem('activeOrg', JSON.stringify(org))
}

export function clearActiveOrg() {
  activeOrg.set(null)
  localStorage.removeItem('activeOrg')
}
```

### Org-Scoped Middleware (Backend)

```typescript
// /packages/api/src/middleware/org-scope.ts
import { middleware } from '../trpc'
import { workspaces } from '../db/schema'
import { eq } from 'drizzle-orm'
import { db } from '../db/connection'

export const orgScopedMiddleware = middleware(async ({ ctx, next }) => {
  const { user, activeOrgId } = ctx

  if (!activeOrgId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Active organization is required',
    })
  }

  // Verify user is member of this org (via WorkOS API or cached)
  const isMember = await verifyOrgMembership(user.id, activeOrgId)
  if (!isMember) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'User is not a member of this organization',
    })
  }

  return next({
    ctx: {
      ...ctx,
      organizationId: activeOrgId,
    },
  })
})
```

---

## Cross-Workspace Aggregation Queries

All queries that aggregate across workspaces must filter by `organizationId`.

**Example: Get all workspaces for active org:**

```typescript
const workspaces = await db
  .select()
  .from(workspacesTable)
  .where(eq(workspacesTable.organizationId, ctx.organizationId))
```

**Example: Get all tasks across all org workspaces:**

```typescript
const tasks = await db
  .select()
  .from(tasks)
  .innerJoin(projects, eq(tasks.projectId, projects.id))
  .innerJoin(workspaces, eq(projects.workspaceId, workspaces.id))
  .where(eq(workspaces.organizationId, ctx.organizationId))
```

---

## Frontend Architecture Changes

### Route Structure (Org-Prefixed)

```
/                              → My Work (unified, all orgs)
/:orgSlug                      → Per-org Home
/:orgSlug/projects             → Org projects list
/:orgSlug/project/:id/kanban   → Project Kanban
/:orgSlug/project/:id/sprints  → Sprint board
/:orgSlug/project/:id/sprints/backlog → Backlog
/:orgSlug/velocity             → Org velocity page
/:orgSlug/settings             → Org settings (future)
```

### Org Switcher Component

```svelte
<!-- /packages/web/src/lib/components/OrgSwitcher.svelte -->
<script lang="ts">
  import { activeOrg, setActiveOrg } from '$lib/stores/active-org.svelte'
  
  // Fetch user's organizations from WorkOS
  // Render dropdown with org list
  // On select: setActiveOrg(selectedOrg)
  // Navigate to /:orgSlug
</script>
```

### QuickAdd Org Targeting

QuickAdd targets the active org's inbox project by default. If no org is active, prompts user to select one.

---

## Session Management

### Org Session Lifecycle

| Event | Action |
|-------|--------|
| Clock-in | Create `org_sessions` row with `start_time`, `end_time = NULL` |
| Clock-out | Set `end_time`, trigger auto-enrichment |
| Page refresh | Resume live session if `end_time IS NULL` |
| Forgotten clock-out | Retroactive close on next login |
| Overlapping sessions | Allowed. Multiple live sessions per user. |

### Auto-Timeout Logic

If a session has been live for more than `working_hours_end - working_hours_start` hours, prompt user to close it. Configurable via `organization_settings`.

---

## Testing Requirements

### Schema Tests

- [ ] `organization_settings` table exists with all columns
- [ ] `org_sessions` table exists with all columns
- [ ] `time_entries` table does not exist
- [ ] `tasks.order` column exists
- [ ] `workspace_members` unique constraint exists
- [ ] All indexes created

### Integration Tests

- [ ] Org-scoped middleware rejects non-members
- [ ] Cross-workspace queries filter by org correctly
- [ ] Auto-enrichment computes correct values on clock-out
- [ ] Retroactive session close works
- [ ] Overlapping sessions allowed

### Migration Tests

- [ ] Migration runs without errors on existing database
- [ ] Existing workspace data backfilled correctly
- [ ] No data loss during migration

---

## Dependencies

- WorkOS SDK (already integrated)
- Drizzle ORM (already in use)
- PostgreSQL (already in use)

---

## Deliverables

1. ✅ Migration file: `0003_org_sessions_and_settings.sql`
2. ✅ Drizzle schema updates
3. ✅ Active-org store (frontend)
4. ✅ Org-scoped middleware (backend)
5. ✅ Route structure updated (org-prefixed)
6. ✅ `timeEntries` table and endpoints removed
7. ✅ `org_sessions` table and endpoints created
8. ✅ `organization_settings` table created

---

## Next Level

L0 is the foundation. L1 (Multi-Org Core) depends on L0 being complete. L1 builds the user-visible org switching, unified views, and clock-in/out experience on top of this infrastructure.
