# Saha

A project management tool for workers who operate across multiple work identities. One account, multiple Organizations, personal trackable work — with Kanban, sprints, velocity, and capacity planning.

## Language

**Organization**:
A real-world employer or business entity. Authenticated via WorkOS. An Organization contains one or more Workspaces. Owns the billing/admin relationship.
_Avoid_: Company, business, client, employer

**Workspace**:
A container for projects within an Organization (or standalone for personal use). An Organization like "Acme Corp" might have Workspaces like "Dev Team" and "Marketing Team." A user also has a single personal Workspace not tied to any Organization.
_Avoid_: Team, group, department, board

**Project**:
A deliverable or workstream within a Workspace. Contains tasks, sprints, and (future) files. A Project can be **Archived** (work is complete, becomes read-only, moved to Archived section, recoverable) or **Soft-Deleted** (created by mistake, hidden in Trash, recoverable for N days, then permanently purged).
_Avoid_: Board, initiative, epic

**Sprint**:
A time-boxed period for completing work within a Project. Duration is fully flexible (any start/end dates). Velocity is computed by when work was completed, not by which Sprint owns the task.
_Avoid_: Iteration, cycle, milestone

**Task**:
The fundamental unit of work. Lives in a Project. Has status (To Do, In Progress, Review, Done), priority, story points, due date, and optional deadline. Can be assigned to a Sprint.
_Avoid_: Card, ticket, issue, item

**Deadline**:
A hard cutoff date after which a task is considered overdue. Distinct from due date (target). Triggers a persistent warning badge in the UI when passed.
_Avoid_: Hard due date, drop-dead date

**Due Date**:
The target completion date for a task. Set via NLP quick-add or modal. Shows on the task card.
_Avoid_: Target date, ETA

**Sprint Flag**:
A label on a task explaining why it was added to an active Sprint mid-cycle. `null` means the task was planned before the Sprint started. When a task enters an active Sprint via drag-and-drop, it is auto-flagged with `unscheduled` by default. The PM can change it to any other flag value. Defined values (enforced in application code, stored as text in the database):

- `unscheduled` — new work that came up unexpectedly mid-sprint
- `pulled_forward` — work moved from a future Sprint into the current Sprint
- `emergency` — critical bug/issue that must be handled immediately
- `reopened` — task was marked Done, then reopened during the Sprint

_Avoid_: Tag, marker, label

**Velocity**:
Story points completed within a date window, regardless of which Sprint owns the task. Computed on read, never stored. Three view modes: Live (active Sprint), Snapshot (completed Sprint), Custom Range (any dates). Velocity is presented as raw numbers with context — the system never interprets the result (e.g., never labels a velocity of 0 as "failure"). The PM investigates using the accompanying flagged tasks list and date range display.

**Capacity**:
The number of hours an employee can work in a given Sprint. Set by the PM per Sprint per person. Compared against total estimated hours of assigned tasks. Triggers an overload warning when assigned hours exceed capacity.

Tasks without estimated hours are tracked separately as "unestimated" in the Capacity table. A high count of unestimated tasks also triggers a warning — the PM cannot trust the capacity numbers until estimates are filled in.

## Relationships

- An **Organization** contains one or more **Workspaces**
- A **Workspace** belongs to exactly one **Organization** (or is personal, with no Organization)
- A **Workspace** contains one or more **Projects**
- A **Project** contains many **Tasks** and many **Sprints**
- A **Sprint** belongs to exactly one **Project** and can contain many **Tasks**
- A **Task** belongs to exactly one **Project**, optionally one **Sprint**, optionally one assignee (a User)

## Example dialogue

> **Dev:** "When a user joins an Organization, do they automatically become a member of every Workspace?"
> **Domain expert:** "No — Organization membership is separate from Workspace membership. Being added to an Organization gives you access to join Workspaces within it, but each Workspace has its own member list."
>
> **Dev:** "If I complete a Task from Sprint 3 during Sprint 2's dates, whose Velocity gets the credit?"
> **Domain expert:** "Sprint 2 — Velocity is measured by when work shipped, not by which Sprint owns the Task. Sprint 2's date window captures the completion."
>
> **Dev:** "What happens when a Sprint ends?"
> **Domain expert:** "It locks. No new Tasks can be added to it. Its Velocity becomes a frozen Snapshot. You can still view it for retrospectives, but it won't change anymore."

## Flagged Ambiguities

- "Company" was used interchangeably with "Organization" — resolved: **Organization** is the canonical term, matching WorkOS's language.
- "Organization" in WorkOS context vs. domain context — these are the same thing. WorkOS manages authentication; Saha manages workspaces and projects within it.
- Task reopening in a completed Sprint — resolved: tasks can be reopened freely **during** the Sprint window (between start and end dates). Once a Sprint locks at its end date, status changes are blocked. To reopen a task from a completed Sprint, the PM must drag it into a future active Sprint — it gets auto-flagged (default: `unscheduled`), and the PM can change the flag.
- Deadline overdue badge scope — resolved: the "N overdue" badge in the top bar only counts overdue tasks from currently-visible Workspaces (matching the Workspace filter). If a Workspace is filtered out, its overdue tasks do not appear in the badge. This prevents privacy leaks during screen sharing.
- Home view task inclusion — resolved: Home shows all tasks that need attention right now. The rule: (a) any task with status = `in_progress` (regardless of due date), (b) any task with due date = today and status ≠ `done`, and (c) any overdue task (due date < today, status ≠ `done`). Future-dated tasks with status = `todo` or `review` do NOT appear on Home — they live in their Project views until their due date arrives or work begins.
- Dwell time display — resolved: the task card shows both the current session's dwell time and the cumulative total (all sessions combined) for the current column. Format: "2 days (4 total)". This gives PMs both current momentum and full time investment at a glance.
- Sprint deletion with active tasks — resolved: when a PM deletes a Sprint that contains tasks, the system prompts: "Delete the tasks too, or move them to the Backlog?" The PM chooses per deletion. If they choose to keep the tasks, all affected tasks have their `sprintId` set to null and appear in the Backlog.
- Task ordering in Kanban columns — resolved: tasks auto-sort by priority (P0 at top, P3 at bottom), then by creation time within each priority tier. No manual drag-to-reorder in v1.
- Task assignment to non-workspace-member — resolved: if a PM assigns a task to a user who is not a member of the task's Workspace, the assignment is rejected. The task is created/updated with the assignee left empty, and a validation message appears: "[name] is not a member of this Workspace." The PM must add the user to the Workspace before assigning tasks to them.
- Workspace deletion — resolved: Workspace deletion is a **hard-delete with cascade**. Deleting a Workspace permanently destroys all its Projects, Tasks, Sprints, and associated audit logs. This is irreversible. To prevent accidents, the system requires the user to type the Workspace name to confirm. Workspaces can also be archived (soft alternative) — but delete is a permanent path for workspaces that were truly created by mistake.
- Last member leaving a Workspace — resolved: when the last member leaves a Workspace, it is **orphaned but preserved**. All Projects, Tasks, and Sprints remain intact. No one can see or access the Workspace until an Organization admin adds a new member. The data is safe but inaccessible.
- Personal Workspace deletion — resolved: the Personal Workspace **cannot be deleted**. It is a system-guaranteed space created automatically on signup and always exists. The user can ignore it, but it cannot be removed.
- Overlapping Sprints — resolved: overlapping Sprints in the same Project are **allowed**. During the overlap period, a completed Task counts toward the velocity of ALL overlapping Sprints. The PM chose overlapping sprints and accepts the double-counting. The system does not prevent or warn about overlaps.
- Cross-project Task movement — resolved: tasks are **scoped to their Project forever**. A Task cannot be moved to a different Project, even within the same Workspace. If work belongs in another Project, the PM must delete the Task and recreate it in the target Project.
- Employee departure from an Organization — resolved: when a user leaves or is removed from an Organization, their assigned tasks **remain assigned to them** — the assignee is not cleared. Completed tasks preserve the departed user's name for historical accuracy. The admin can still view the departed employee's profile for historical velocity and contribution data. In the UI: active employees appear normally in tables and listings; departed employees appear at the bottom of listings with a disabled/grayed-out visual style, grouped under a "Past Employees" section. Capacity data for departed employees is preserved for historical reference.
- Concurrent task edits — resolved: **last-write-wins** for v1. The latest save overwrites previous changes without warning. This is acceptable because every mutation is audit-logged — if PM A's change is overwritten by PM B, the audit trail preserves both changes and who made them. The PM can reconstruct what happened from the activity feed. Optimistic locking is a future enhancement.
