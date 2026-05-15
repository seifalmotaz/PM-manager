# Data Models & Database Schema Audit Report

**Audit Date:** May 15, 2026  
**Audited Module:** Database Schema, Data Models, Relationships  
**Severity Distribution:** 2 Critical, 4 High, 5 Medium, 4 Low

---

## Executive Summary

This PM-manager application uses **Drizzle ORM with PostgreSQL**. The schema has **11 tables** defined across **3 migrations**. Overall, the schema is **well-structured for a project management tool**, but several **critical gaps exist between the documented domain model (CONTEXT.md) and the actual database implementation**.

---

## Area 1: Core Entity Tables

### Current State

**Tables Exist:**
- `users` - User accounts
- `workspaces` - Workspace containers (personal/company)
- `workspace_members` - Membership join table
- `projects` - Project containers
- `sprints` - Sprint management
- `tasks` - Core work items
- `employee_capacity` - Sprint capacity per user
- `comments` - Polymorphic comments
- `checklist_items` - Task checklists
- `time_entries` - Time tracking
- `notifications` - User notifications
- `audit_logs` - Activity log

### CRITICAL: Missing Project Archive/Soft-Delete System

**Problem:** CONTEXT.md explicitly defines project lifecycle:
- *"Archived (work is complete, becomes read-only, moved to Archived section, recoverable)"*
- *"Soft-Deleted (created by mistake, hidden in Trash, recoverable for N days, then permanently purged)."*

**File References:**
- `/CONTEXT.md` (Lines 16-17)
- `/packages/api/src/db/schema.ts` (Lines 32-41)

**Schema Missing:**
```typescript
// projects table is missing:
isArchived: boolean('is_archived').default(false),
archivedAt: timestamp('archived_at'),
deletedAt: timestamp('deleted_at'), // for soft delete
```

**Impact:**
- Projects cannot be archived or soft-deleted as specified
- No way to hide completed projects from active views
- No data recovery path for accidental deletions

---

### CRITICAL: Missing Task `order` Column

**Problem:** CONTEXT.md explicitly states:
- *"keep `order` column for future manual reorder. v1 auto-sorts by priority then createdAt; `order` is ignored but exists for v2 when manual reorder is implemented."*

**File References:**
- `/CONTEXT.md` (Line 101)
- `/packages/api/src/db/schema.ts` (Lines 56-75)

**Schema Missing:**
```typescript
// tasks table is missing:
order: integer('order').default(0),
```

**Impact:**
- Manual task reordering (planned feature) cannot be implemented without schema changes
- Future V2 enhancement blocked

---

### HIGH: Sprint Status Not Persisted Reliably

**Problem:** Sprint status ('planned', 'active', 'completed') is stored in database but the schema comment says it's **computed dynamically** from dates. However, the code shows it IS persisted but "lazy refreshed".

**File References:**
- `/packages/api/src/db/schema.ts` (Line 50)
- `/packages/api/src/modules/sprint/sprint.service.ts` (Lines 28-40, 63-109)

**Issue:**
- Status field exists but can become stale (not updated in real-time)
- Race condition potential where status field doesn't match computed status
- `plannedPoints` only set when sprint completes (Line 73-75 of capacity.service.ts)

---

## Area 2: Relationships and Foreign Keys

### Current State

**Relationships Defined:**
```
users ─┬─< workspace_members >─┬─ workspaces
      │                        └─< projects ─┬─< tasks ─┬─< time_entries
      │                                       │         ├─< checklist_items  
      │                                       │         └─> sprints
      │                                       └─< sprints ─┬─< employee_capacity
      │                                                    └─> projects
      └─< notifications
      
workspaces ─< workspace_members ─> users
projects ─< tasks ─< comments
audit_logs ─> users (all entities)
```

### HIGH: Missing Index for assigneeId on Tasks

**Problem:** Tasks table has `assigneeId` foreign key but no index for this common query pattern.

**File Reference:**
- `/packages/api/src/db/schema.ts` (Lines 56-75)

**Impact:**
- Capacity table queries filter by assigneeId
- Dashboard filtering by assignee will be slow at scale

**Missing:**
```typescript
assigneeIdx: index('idx_tasks_assignee').on(table.assigneeId),
```

---

### MEDIUM: No Unique Constraint on workspace_members

**Problem:** `workspace_members` table allows duplicate memberships (same user, same workspace).

**File Reference:**
- `/packages/api/src/db/schema.ts` (Lines 24-30)

Current schema allows duplicate (workspaceId, userId) pairs.

**Missing:**
```typescript
, (table) => ({
  uniqueMember: uniqueIndex('idx_workspace_members_unique').on(table.workspaceId, table.userId),
})
```

---

### LOW: Sprint tasks_sprintId FK Uses NO ACTION

**Problem:** `tasks.sprintId` foreign key uses `ON DELETE no action` instead of `SET NULL` for clean backlog behavior.

**File References:**
- `/packages/api/src/db/migrations/0000_slimy_thing.sql` (Line 105)
- `/packages/api/src/db/schema.ts` (Line 68)

**Current:**
```typescript
sprintId: uuid('sprint_id').references(() => sprints.id),
// Defaults to ON DELETE NO ACTION (restricts deletion)
```

**Impact:**
- Sprint deletion requires manual task unassignment BEFORE deletion
- The code handles this correctly in `/packages/api/src/modules/sprint/sprint.service.ts` (Lines 284-303)
- However, `SET NULL` would be cleaner at database level

---

## Area 3: Missing Features

### HIGH: No Labels/Tags System

**Problem:** No table for task labels or tags. This is a standard PM feature referenced in nlp-parser comments.

**File Reference:**
- `/packages/shared/src/nlp-parser.ts` (Line 30)

**Missing Tables:**
```typescript
export const labels = pgTable('labels', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull(),
})

export const taskLabels = pgTable('task_labels', {
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  labelId: uuid('label_id').notNull().references(() => labels.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.taskId, table.labelId] }),
}))
```

---

### HIGH: Organizations Table Not Created

**Problem:** `workspaces.organizationId` field exists, but there's no `organizations` table. CONTEXT.md defines Organization as a core concept.

**File References:**
- `/CONTEXT.md` (Lines 7-12)
- `/packages/api/src/db/schema.ts` (Line 18)

**Current Schema:**
```typescript
organizationId: text('organization_id'), // Just a text field, no FK
```

**Impact:**
- Organization references are opaque strings (likely WorkOS org IDs)
- Cannot query organization members or organization workspaces efficiently
- No local organization metadata (name, billing, etc.)

---

### MEDIUM: No Workspace/Project Soft Delete

**Problem:** CONTEXT.md explicitly states:
- *"Workspace deletion is a hard-delete with cascade"*
- *"Personal Workspace cannot be deleted"*

However:
1. There's no `isInbox` check on workspace (PROJECTS have it, but workspaces don't prevent personal workspace deletion)
2. No soft-delete mechanism for projects
3. Hard delete of projects cascade deletes all tasks without audit trail recovery

**Risk:**
- Accidental data loss
- No recovery path for deleted workspaces

---

## Area 4: Data Integrity

### Current State

Constraints implemented:
- Foreign key relationships
- Cascade deletes on most tables
- Status values validated in application code

### HIGH: Status Enum Not Enforced in Database

**Problem:** Task and Sprint status fields are TEXT without CHECK constraints.

**File References:**
- `/packages/api/src/db/schema.ts` (Lines 50, 61)
- `/packages/api/src/modules/task/task.router.ts` (Lines 19, 82)

**Current:**
```typescript
status: text('status').notNull().default('todo'),
status: text('status').notNull().default('planned'),
```

**Risk:**
- Invalid status values can be inserted at database level
- Application validates, but direct DB access could corrupt data

**Recommended:**
```typescript
status: text('status', { enum: ['todo', 'in_progress', 'review', 'done'] }).notNull().default('todo'),
```

---

### MEDIUM: Priority Enum Not Enforced

**Problem:** Task priority is TEXT and can accept any value, though application uses p0-p3.

**File Reference:**
- `/packages/api/src/db/schema.ts` (Line 62)

---

### LOW: Decimal Columns Returned as Strings

**Problem:** `storyPoints` and `estimatedHours` use `decimal` type which Drizzle returns as strings, requiring manual conversion.

**File References:**
- `/packages/api/src/modules/task/task.service.ts` (Line 219)
- `/packages/api/src/modules/sprint/capacity.service.ts` (Line 59)

**Code workarounds:**
```typescript
// Services must do this conversion:
if (currentValue !== undefined && currentValue !== null && (key === 'storyPoints' || key === 'estimatedHours')) {
  currentValue = Number(currentValue)
}
```

**Recommendation:** Use `real` or `numeric` type, or ensure consistent handling across all decimal fields.

---

## Area 5: Audit and Notifications

### Current State

**audit_logs table:**
```typescript
{
  id, entityType, entityId, action, field, oldValue, newValue, userId, createdAt
}
```

**notifications table:**
```typescript
{
  id, userId, type, title, body, entityType, entityId, isRead, createdAt
}
```

### MEDIUM: Audit Log Fire-and-Forget Pattern

**Problem:** Audit logs use "fire-and-forget" pattern - failures are logged to console but don't fail operations.

**File Reference:**
- `/packages/api/src/shared/audit/audit.service.ts` (Lines 21-30)

**Impact:**
- Audit trail may have gaps
- Impossible to know which operations lack audit records
- Consider queuing/retry mechanism

---

### LOW: Notification EntityType Not Restricted

**Problem:** `notifications.entityType` and `entityId` are nullable with no FK constraint.

**File Reference:**
- `/packages/api/src/db/schema.ts` (Lines 138-150)

This is intentional for flexibility, but could lead to orphaned notifications if referenced entities are deleted.

---

## Area 6: Migration Status

### Current State

**3 Migrations Applied:**
1. `0000_slimy_thing.sql` - Core tables (users, workspaces, projects, sprints, tasks)
2. `0001_bored_warstar.sql` - Comments, checklists, time entries + indexes
3. `0002_fat_toad.sql` - Notifications table

### MEDIUM: Schema Spec Test Missing New Tables

**Problem:** The schema specification test only checks 8 tables, but there are actually 11 tables.

**File Reference:**
- `/packages/api/src/db/schema.spec.ts` (Lines 27-38)

**Current Test:**
```typescript
const expected = ['audit_logs', 'employee_capacity', 'projects', 'sprints', 'tasks', 'users', 'workspace_members', 'workspaces']
// Missing: comments, checklist_items, time_entries, notifications
```

---

## Area 7: Index Analysis

### Current Indexes

**Implemented:**
- `idx_comments_entity` (entityType, entityId, createdAt)
- `idx_comments_author` (authorId)
- `idx_checklist_task_order` (taskId, sortOrder)
- `idx_time_entries_task` (taskId)
- `idx_time_entries_user` (userId)
- `idx_time_entries_running` (userId) WHERE endTime IS NULL (partial index)
- `idx_notifications_user_read` (userId, isRead, createdAt)

### HIGH: Tasks table needs more indexes

**Missing indexes for common query patterns:**
1. `assigneeId` - Used in capacity calculations and assignee filtering
2. `projectId + status` - Used in kanban board queries
3. `sprintId` - Used in sprint backlog views
4. `deadline` - Used in overdue calculations
5. `statusChangedAt` - Used in dwell time displays

**File Reference:**
- `/packages/web/src/lib/components/TaskCard.svelte` (Lines 94-98)

---

## Area 8: Relationship Cardinality Issues

### MEDIUM: Missing Unique Constraints

**Problem:** Several tables lack unique constraints that could prevent data corruption:

1. **workspace_members:** Can have duplicate (workspaceId, userId) pairs
2. **employee_capacity:** Can have multiple capacity entries per (sprintId, userId)
3. **time_entries running timer:** Uses partial unique index correctly ✓

---

## Summary Table

| Severity | Issue | File Reference |
|----------|-------|----------------|
| **Critical** | Missing project archive/soft-delete | schema.ts:32-41, CONTEXT.md:16-17 |
| **Critical** | Missing task `order` column | schema.ts:56-75, CONTEXT.md:101 |
| **High** | Sprint status synchronization | sprint.service.ts:63-109 |
| **High** | No labels/tags system | N/A - missing feature |
| **High** | Organizations table missing | schema.ts:18, CONTEXT.md:7-12 |
| **High** | No personal workspace deletion protection | CONTEXT.md:86 |
| **Medium** | Missing task indexes (assigneeId, projectId+status) | schema.ts:56-75 |
| **Medium** | No unique constraint on workspace_members | schema.ts:24-30 |
| **Medium** | Status values not validated in DB | schema.ts:50,61 |
| **Medium** | Audit log gaps possible | audit.service.ts:21-30 |
| **Low** | Decimal as string handling | task.service.ts:219 |
| **Low** | Schema test out of sync | schema.spec.ts:27-38 |

---

## Recommendations

### Immediate Actions (Critical/High)

1. **Add `order` column to tasks table** - Required for V2 manual reordering
2. **Add `isArchived`, `archivedAt`, `deletedAt` to projects** - Enable archive/soft-delete flow
3. **Create unique index on workspace_members (workspaceId, userId)** - Prevent duplicate memberships
4. **Add index on tasks.assigneeId** - Improve query performance
5. **Create organizations table** - If organization features are planned

### Medium Priority

1. Add CHECK constraints or ENUM types for status fields
2. Add index on tasks (projectId, status) for kanban queries
3. Consider unique constraint on employee_capacity (sprintId, userId)
4. Update schema.spec.ts to include all tables

### Low Priority

1. Consider switching storyPoints/estimatedHours to `real` type
2. Implement audit log retry mechanism
3. Add personal workspace deletion protection at code level