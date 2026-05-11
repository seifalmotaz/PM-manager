import { pgTable, uuid, text, timestamp, numeric, integer, index, uniqueIndex, foreignKey } from 'drizzle-orm/pg-core'

// ─── Users ────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull(),
  name: text().notNull().default(''),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('users_email_unique').on(table.email),
])

// ─── Workspaces ───────────────────────────────────

export const workspaces = pgTable('workspaces', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  slug: text().notNull(),
  type: text().notNull(),  // 'personal' | 'company'
  companyId: text('company_id'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('workspaces_slug_unique').on(table.slug),
])

// ─── Workspace Members ────────────────────────────

export const workspaceMembers = pgTable('workspace_members', {
  id: uuid().primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: text().notNull().default('member'),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (table) => [
  index('workspace_members_user_id_idx').on(table.userId),
  index('workspace_members_workspace_id_idx').on(table.workspaceId),
])

// ─── Projects ─────────────────────────────────────

export const projects = pgTable('projects', {
  id: uuid().primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  name: text().notNull(),
  description: text(),
  color: text(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('projects_workspace_id_idx').on(table.workspaceId),
])

// ─── Sprints ──────────────────────────────────────

export const sprints = pgTable('sprints', {
  id: uuid().primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  name: text().notNull(),
  goal: text(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  status: text().notNull().default('planned'),  // 'planned' | 'active' | 'completed'
  plannedPoints: numeric('planned_points'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('sprints_project_id_idx').on(table.projectId),
])

// ─── Tasks ────────────────────────────────────────

export const tasks = pgTable('tasks', {
  id: uuid().primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  title: text().notNull(),
  description: text(),
  status: text().notNull().default('todo'),  // 'todo' | 'in_progress' | 'review' | 'done'
  priority: text(),  // 'p0' | 'p1' | 'p2' | 'p3'
  storyPoints: numeric('story_points'),
  estimatedHours: numeric('estimated_hours'),
  actualHours: numeric('actual_hours'),
  assigneeId: uuid('assignee_id').references(() => users.id),
  dueDate: timestamp('due_date'),
  deadline: timestamp(),
  sprintId: uuid('sprint_id').references(() => sprints.id),
  sprintFlag: text('sprint_flag'),  // 'unscheduled' | 'pulled_forward' | 'emergency' | 'reopened'
  order: integer().notNull().default(0),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('tasks_project_id_idx').on(table.projectId),
  index('tasks_sprint_id_idx').on(table.sprintId),
  index('tasks_assignee_id_idx').on(table.assigneeId),
  index('tasks_status_idx').on(table.status),
  index('tasks_completed_at_idx').on(table.completedAt),
])

// ─── Audit Logs ───────────────────────────────────

export const auditLogs = pgTable('audit_logs', {
  id: uuid().primaryKey().defaultRandom(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  action: text().notNull(),
  field: text(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  userId: uuid('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('audit_logs_entity_type_idx').on(table.entityType, table.entityId),
  index('audit_logs_user_id_idx').on(table.userId),
])

// ─── Employee Capacity ────────────────────────────

export const employeeCapacity = pgTable('employee_capacity', {
  id: uuid().primaryKey().defaultRandom(),
  sprintId: uuid('sprint_id').notNull().references(() => sprints.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  capacityHours: numeric('capacity_hours').notNull(),
  note: text(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('employee_capacity_sprint_id_idx').on(table.sprintId),
  index('employee_capacity_sprint_user_idx').on(table.sprintId, table.userId),
])