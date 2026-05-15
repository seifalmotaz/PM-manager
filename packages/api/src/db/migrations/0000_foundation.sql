CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" text NOT NULL,
	"field" text,
	"old_value" text,
	"new_value" text,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"content" text NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"content" text NOT NULL,
	"author_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_capacity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sprint_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"capacity_hours" numeric NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"entity_type" text,
	"entity_id" uuid,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"note" text,
	"tasks_completed" integer,
	"story_points_completed" numeric,
	"estimated_hours_sum" numeric,
	"frozen" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_settings" (
	"organization_id" text NOT NULL,
	"default_sprint_length_days" integer DEFAULT 14 NOT NULL,
	"working_hours_start" text DEFAULT '09:00' NOT NULL,
	"working_hours_end" text DEFAULT '17:00' NOT NULL,
	"working_days" text DEFAULT '[1,2,3,4,5]' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"require_clock_in" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_settings_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text,
	"is_inbox" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sprints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"goal" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"planned_points" numeric,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'todo' NOT NULL,
	"priority" text,
	"story_points" numeric,
	"estimated_hours" numeric,
	"assignee_id" uuid,
	"due_date" timestamp,
	"deadline" timestamp,
	"sprint_id" uuid,
	"sprint_flag" text,
	"order" integer DEFAULT 0,
	"status_changed_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" text NOT NULL,
	"organization_id" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_capacity" ADD CONSTRAINT "employee_capacity_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_capacity" ADD CONSTRAINT "employee_capacity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_sessions" ADD CONSTRAINT "org_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_checklist_task_order" ON "checklist_items" USING btree ("task_id","sort_order");--> statement-breakpoint
CREATE INDEX "idx_comments_entity" ON "comments" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_comments_author" ON "comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_read" ON "notifications" USING btree ("user_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX "idx_org_sessions_user" ON "org_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_org_sessions_org" ON "org_sessions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_org_sessions_time" ON "org_sessions" USING btree ("start_time","end_time");--> statement-breakpoint
CREATE INDEX "idx_org_sessions_user_org_time" ON "org_sessions" USING btree ("user_id","organization_id","start_time");--> statement-breakpoint
CREATE INDEX "idx_tasks_assignee" ON "tasks" USING btree ("assignee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_workspace_member" ON "workspace_members" USING btree ("workspace_id","user_id");