import { pgTable, uuid, text, timestamp, boolean, decimal, integer, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  workosUserId: text('workos_user_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  type: text('type').notNull(),
  organizationId: text('organization_id'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const workspaceMembers = pgTable('workspace_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
}, (table) => ({
  uniqueMembership: uniqueIndex('unique_workspace_member').on(table.workspaceId, table.userId),
}))

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color'),
  isInbox: boolean('is_inbox').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const sprints = pgTable('sprints', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  goal: text('goal'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  status: text('status').notNull().default('planned'),
  plannedPoints: decimal('planned_points'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('todo'),
  priority: text('priority'),
  storyPoints: decimal('story_points'),
  estimatedHours: decimal('estimated_hours'),
  assigneeId: uuid('assignee_id').references(() => users.id),
  dueDate: timestamp('due_date'),
  deadline: timestamp('deadline'),
  sprintId: uuid('sprint_id').references(() => sprints.id),
  sprintFlag: text('sprint_flag'),
  order: integer('order').default(0),
  statusChangedAt: timestamp('status_changed_at').notNull().defaultNow(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  assigneeIdx: index('idx_tasks_assignee').on(table.assigneeId),
}))

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  action: text('action').notNull(),
  field: text('field'),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  userId: uuid('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const employeeCapacity = pgTable('employee_capacity', {
  id: uuid('id').primaryKey().defaultRandom(),
  sprintId: uuid('sprint_id').notNull().references(() => sprints.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  capacityHours: decimal('capacity_hours').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  content: text('content').notNull(),
  authorId: uuid('author_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  entityIdx: index('idx_comments_entity').on(table.entityType, table.entityId, table.createdAt),
  authorIdx: index('idx_comments_author').on(table.authorId),
}))

export const checklistItems = pgTable('checklist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  isCompleted: boolean('is_completed').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  taskOrderIdx: index('idx_checklist_task_order').on(table.taskId, table.sortOrder),
}))

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body'),
  entityType: text('entity_type'),
  entityId: uuid('entity_id'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userReadIdx: index('idx_notifications_user_read').on(table.userId, table.isRead, table.createdAt),
}))

export const organizationSettings = pgTable('organization_settings', {
  organizationId: text('organization_id').notNull().unique(),
  defaultSprintLengthDays: integer('default_sprint_length_days').notNull().default(14),
  workingHoursStart: text('working_hours_start').notNull().default('09:00'),
  workingHoursEnd: text('working_hours_end').notNull().default('17:00'),
  workingDays: text('working_days').notNull().default('[1,2,3,4,5]'),
  timezone: text('timezone').notNull().default('UTC'),
  requireClockIn: boolean('require_clock_in').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: text('token').notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
})

export const orgSessions = pgTable('org_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: text('organization_id').notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  note: text('note'),
  tasksCompleted: integer('tasks_completed'),
  storyPointsCompleted: decimal('story_points_completed'),
  estimatedHoursSum: decimal('estimated_hours_sum'),
  frozen: boolean('frozen').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdx: index('idx_org_sessions_user').on(table.userId),
  orgIdx: index('idx_org_sessions_org').on(table.organizationId),
  timeIdx: index('idx_org_sessions_time').on(table.startTime, table.endTime),
  userOrgTimeIdx: index('idx_org_sessions_user_org_time').on(table.userId, table.organizationId, table.startTime),
}))