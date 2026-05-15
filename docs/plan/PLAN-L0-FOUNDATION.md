# Saha — Level 0: Foundation

**Version:** 2.0  
**Date:** May 15, 2026  
**Status:** Approved  
**Type:** Architecture & Database Specification

---

## Objective

Build the architectural foundation that all subsequent levels depend on. This level creates the database tables, migration strategy, and WorkOS integration that make the multi-organization model possible. No user-visible features ship in L0.

---

## Decision Log (Grilled Questions & Answers)

### Decision 1: Do we build a full organizations table, or rely on WorkOS?

**Question:** WorkOS already owns organization identity and membership. Should Saha duplicate this with its own `organizations` table and `organization_members` table, or should we treat WorkOS as the single source of truth?

**Resolution:** WorkOS is the source of truth. Saha does NOT build an `organizations` table. Saha stores only `organization_settings` — configuration that WorkOS cannot store (sprint defaults, working hours, timezone, etc.).

**Rationale:**
- WorkOS already handles auth, org membership, SSO, and org identity. Duplicating this creates sync problems.
- The `workspaces` table already has an `organizationId` field pointing to WorkOS org IDs. This field becomes the join key.
- Saha-specific settings need a home. A new `organization_settings` table keyed to WorkOS org IDs solves this without duplicating membership data.

**Rejected alternative:** Full Saha-owned organizations table. This would require syncing membership between WorkOS and Saha, creating a two-source-of-truth problem.

---

### Decision 2: What settings does Saha need per organization?

**Question:** WorkOS stores identity. What Saha-specific configuration does Saha need that justifies the `organization_settings` table?

**In-scope settings (5 fields):**
1. `defaultSprintLengthDays` — When a PM creates a sprint, the end date auto-suggests as start date + this value. Default: 14 days.
2. `workingHoursStart` / `workingHoursEnd` — Defines the org's typical workday. Used for clock-in defaults and auto-timeout logic. Default: 09:00–17:00.
3. `workingDays` — Which days count as working days (e.g., Monday–Friday). Stored as an array of integers (1=Monday, 5=Friday). Affects sprint duration calculations.
4. `timezone` — Normalizes all timestamps for timesheet aggregation and reporting. Default: UTC.
5. `requireClockIn` — Whether the org mandates a clock-in before task status changes are allowed. Default: false (optional).

**Out-of-scope settings (deferred):**
- `retentionPolicyDays` — Deferred. Not needed until soft-delete is implemented.
- `hrVisibilityScope` — Deferred. Not needed until HR role permissions are defined.

---

### Decision 3: Task-level timer vs. org-level clock-in

**Question:** The existing system has a per-task timer (`timeEntries` table, `TimeTracker.svelte`). Should we keep task-level timers, or switch to org-level clock-in/out?

**Resolution:** Org-level clock-in/out. Task-level timer is eliminated entirely.

**Rationale (from grilling):**
- **Product Owner's insight:** "If we do task-based time, we go through a lot of problems. What if user did not hit start when he started? What if he finished but did not remember to start this timer and it was calculated on another task timer?"
- **Trade-off accepted:** We sacrifice per-task stopwatch precision for data reliability. Task-level duration is approximated from status transition timestamps rather than stopwatch accuracy, in exchange for never having missing or corrupted time data.

**What changes:**
- `timeEntries` table is dropped.
- A new `org_sessions` table is created to track org-level clock-in/out.
- Task completion data is auto-captured from the task's own timestamps (`startedAt`, `completedAt`) and recorded against the active org session.
- The old `TimeTracker.svelte` is removed. A new org clock-in/out button lives in the topbar.

---

### Decision 4: How does the org session auto-enrichment work?

**Question:** When a user clocks out, what data gets computed and stored in the `org_sessions` row?

**Resolution:** Three auto-enriched fields are computed on clock-out:

1. `tasksCompleted` — Count of tasks where `completedAt` falls between the session's `startTime` and `endTime`, AND the task is assigned to this user, AND status is `done`.
2. `storyPointsCompleted` — Sum of `storyPoints` for those same tasks.
3. `estimatedHoursSum` — Sum of `estimatedHours` for those same tasks.

**Why store rather than compute on read:** The sprint estimation accuracy needs these numbers to be frozen at sprint completion. If we compute on read and the underlying task data changes, sprint metrics silently shift. Auto-enrichment at clock-out creates a stable point-in-time record.

---

### Decision 5: Can org sessions overlap?

**Question:** If an engineer is working for Acme Corp and FreelanceCo at the same time (e.g., handling a freelance emergency during work hours), can both org sessions run simultaneously?

**Resolution:** Yes. Overlapping sessions are allowed.

**Rationale:** The product owner confirmed this is acceptable for the targeted use case. The engineer might clock into both orgs and the system should reflect reality. The timesheet view will show both sessions.

---

### Decision 6: What happens if the user never clocks out?

**Question:** Engineer starts an org session in the morning, works all day, goes home without clicking "Stop." The session is left open. What happens?

**Resolution:** Retroactive close on next login.

**Behavior:**
1. User logs in the next day.
2. System detects a live session (no `endTime`) from a previous day.
3. User is prompted: "You still had a running session for [Org Name] from [yesterday's date]. Close it?"
4. User chooses: "Close" → session ends at current time (or user can specify time). "Ignore" → session stays live.
5. If closed, auto-enrichment fires with whatever task data exists between start and the retroactive end time.

**Edge case:** If the user was on PTO for a week and the session was from last Friday, they can retroactively close it with the correct end time.

---

### Decision 7: What existing schema additions are needed?

**Question:** Beyond the new tables, what fixes does the current schema need based on the audit findings?

**Resolution (3 additions):**
1. **`tasks.order` column** — An integer column needed for future manual task reordering (CONTEXT.md line 101). Added now at zero cost; avoids a migration later when it becomes needed.
2. **Unique constraint on `workspace_members`** — The current schema allows duplicate (workspaceId, userId) pairs. A unique constraint prevents double-membership bugs.
3. **Index on `tasks.assigneeId`** — Missing index for a common query pattern (capacity calculations, assignee filtering, member profile pages).

---

### Decision 8: How do we scope queries by organization?

**Question:** With no `organizations` table in Saha, how do we filter queries to a specific organization?

**Resolution:** Organization scoping resolves through the workspace chain.

**Resolution path:** Every workspace has an `organizationId` (WorkOS org ID). Every project belongs to a workspace. Every task belongs to a project. Every sprint belongs to a project. So any entity can be org-scoped by joining through its parent chain.

**Middleware:** A backend middleware extracts the active org ID from the session. It validates (via WorkOS API or cached membership) that the user is a member of this org. Every downstream query inherits the org context.

---

## New Tables Specification

### Table: `organization_settings`

**Purpose:** Saha-specific configuration per organization. Keyed to WorkOS organization IDs.

**Fields:**
- `organization_id` (TEXT, UNIQUE) — WorkOS organization ID. Primary lookup key.
- `default_sprint_length_days` (INTEGER) — Default sprint duration. Default: 14.
- `working_hours_start` (TIME) — Org workday start. Default: 09:00.
- `working_hours_end` (TIME) — Org workday end. Default: 17:00.
- `working_days` (INTEGER ARRAY) — Working days. Default: [1,2,3,4,5] (Mon–Fri).
- `timezone` (TEXT) — Org timezone. Default: 'UTC'.
- `require_clock_in` (BOOLEAN) — Mandatory clock-in. Default: false.
- Standard timestamps: `created_at`, `updated_at`.

**Row creation:** A row is created automatically when the first workspace is created for an organization. Default values are used; the org admin can change them later.

---

### Table: `org_sessions`

**Purpose:** Replaces `timeEntries`. Tracks org-level clock-in/clock-out sessions with auto-enriched task completion data.

**User-set fields:**
- `user_id` — Who clocked in (FK to users).
- `organization_id` — Which org (WorkOS org ID, not an FK — WorkOS owns this).
- `start_time` — When the user clocked in. Set on create.
- `end_time` — When the user clocked out. NULL while session is live. Set on stop.
- `note` — Optional user note. Free text. For context like "morning was dev work, afternoon was interviews."

**Auto-enriched fields (computed on clock-out):**
- `tasks_completed` — Count of tasks done during this session.
- `story_points_completed` — Sum of story points for those tasks.
- `estimated_hours_sum` — Sum of estimated hours for those tasks.

**System fields:**
- `frozen` (BOOLEAN) — Set to true when the sprint overlapping this session is completed. Frozen sessions are immutable.
- Standard timestamps: `created_at`, `updated_at`.

**Enrichment logic (declarative):**
- Only tasks where `assignee_id = user_id` AND `status = 'done'` AND `completed_at BETWEEN start_time AND end_time` are counted.
- If the session is live (`end_time IS NULL`), enrichment values are zero.
- If a task is completed retroactively (after the session was closed), the session is recomputed IF the session is not frozen. If frozen (sprint completed), the retroactive completion is rejected.

**Indexes:**
- By user, for "my timesheet" queries.
- By organization, for cross-user aggregation.
- By time range, for sprint-scoped velocity computation.
- Composite: user + org + time, for the most common query pattern.

---

### Dropped Table: `timeEntries`

**What happens to existing data:** Dropped entirely. There is no migration of existing timeEntries data into org_sessions. The old model was per-task; the new model is org-level. Direct data migration doesn't make semantic sense. The old data is historical and can be queried from database backups if needed.

**What happens to endpoints:** All `timeEntry.*` tRPC procedures are removed.

**What happens to frontend:** `TimeTracker.svelte` is removed. `TimeEntryForm.svelte` is removed.

---

## Migration Strategy

### Migration File: `0003_org_sessions_and_settings.sql`

**Order of operations:**
1. Create `organization_settings` table (no dependencies).
2. Create `org_sessions` table (depends on users).
3. Add `order` column to `tasks` table.
4. Add indexes on new tables.
5. Add indexes on existing tables (assigneeId).
6. Add unique constraint on `workspace_members`.
7. Drop `timeEntries` table.

**Rollback plan:** Each step is reversible in reverse order. If migration fails mid-way, the database is in a consistent state (only additive changes before the drop).

---

## WorkOS Integration

### Active Organization State

**Frontend store:** A Svelte writable store holds the currently active organization (`id`, `name`, `slug`). Persisted to localStorage for session recovery across page refreshes.

**Org switcher component:** A dropdown in the topbar lists all organizations the user belongs to (fetched from WorkOS Organizations API). Selecting an org sets the active org store and navigates to `/:orgSlug`.

### Backend Middleware

**Org-scoped middleware:**
1. Extracts active org ID from the session.
2. Validates (via WorkOS API or cached membership data) that the authenticated user is a member of this org.
3. If not a member: reject with FORBIDDEN.
4. If no active org: reject with BAD_REQUEST for org-scoped operations.
5. Passes `organizationId` to all downstream resolvers.

**Org resolution for existing entities:** When a query receives a `workspaceId` or `projectId`, the middleware joins through the chain to verify the workspace belongs to the active org. Cross-org access is blocked at the middleware level.

---

## Routes Affected

**Routes that change:**
- Old `/home` → removed. Replaced by `/` (My Work) and `/:orgSlug` (per-org Home) in L1.
- Old `/projects` → removed. Replaced by `/:orgSlug/projects` in L1.
- Old `/velocity` → removed. Replaced by `/:orgSlug/velocity` in L1.
- Old `/project/:id/kanban` → removed. Replaced by `/:orgSlug/project/:id/kanban` in L1.
- Old `/project/:id/sprints` → removed. Replaced by `/:orgSlug/project/:id/sprints` in L1.
- Old `/workspace/:wid/member/:uid` → removed. Replaced by `/:orgSlug/people/:userId` in L5.

**New routes created in L0 (empty shells for L1+):**
- `/:orgSlug` — Per-org Home page (built in L1).
- `/:orgSlug/projects` — Org projects list (built in L1).
- `/:orgSlug/project/:id/kanban` — Project Kanban (rebuilt in L1).
- `/:orgSlug/project/:id/sprints` — Sprint board (built in L2).
- `/:orgSlug/velocity` — Org velocity page (built in L3).
- `/:orgSlug/overview` — Executive dashboard (built in L5).
- `/:orgSlug/people` — Employee directory (built in L5).

---

## Testing Requirements

### Schema Tests
- All new tables exist with correct columns.
- All new indexes exist.
- `timeEntries` table does not exist.
- `order` column exists on tasks.
- Unique constraint on workspace_members.
- Migration runs cleanly on existing database.

### Integration Tests
- Org-scoped middleware rejects non-members.
- Org-scoped middleware rejects missing org.
- Cross-workspace queries filter by org correctly.
- Auto-enrichment computes correct values on clock-out.
- Overlapping sessions allowed.
- Retroactive session close works.
- Frozen sessions reject recomputation.

---

## Dependencies

- WorkOS SDK (already integrated in the app).
- Drizzle ORM (already in use).
- PostgreSQL (already in use).
- No new external dependencies.

---

## Deliverables

1. Database migration creating `organization_settings` and `org_sessions`.
2. Migration adding `order` column, unique constraint, and indexes to existing tables.
3. Migration dropping `timeEntries` table.
4. Active-org Svelte store (frontend).
5. Org-scoped backend middleware.
6. WorkOS org membership verification logic.
7. Route structure prepared (org-prefixed, empty pages for L1+ to fill).
8. Old routes, endpoints, and frontend components removed.

---

## What L0 Does NOT Include

- No user-visible features. All pages at new routes are empty shells.
- No org switcher UI (that's L1).
- No clock-in/out UI (that's L1).
- No sprint creation/completion UI (that's L2).
- No data migration from timeEntries to org_sessions. Old time data is discarded.

---

## Edge Cases Catalog

| Edge Case | Resolution |
|-----------|------------|
| User belongs to 0 organizations after signup | Personal workspace exists without org binding. User can use personal space. |
| User belongs to 10+ organizations | Org switcher dropdown scrolls. No practical limit. |
| WorkOS org is deleted externally | Saha's `organization_settings` row becomes orphaned. Future: cleanup job. For now: manual. |
| Two users in same org with different timezones | `organization_settings.timezone` is the org default. Individual user timezone is a future feature. |
| Migration fails mid-way | All steps before the failure are reversible. Database is consistent. |
| Existing `review` tasks | Migrated to `in_progress` in L2 migration. No action in L0. |
