# Saha — Level 5: HR & Executive

**Version:** 2.0  
**Date:** May 15, 2026  
**Status:** Approved  
**Type:** Product Requirements & Specification  

---

## Objective

Build the organization-level views that convert individual adoption into company-wide adoption. The executive gets a 30-second health check dashboard. The HR manager gets an employee directory with workforce visibility. This is the "company pays" version.

---

## Decision Log (Grilled Questions & Answers)

### Decision 1: Organization dashboard — single page, role-based, or separate pages?

**Question:** The executive needs org-level metrics. The HR manager needs people data. Do we show all of this on one dashboard, split by role, or create separate pages?

**Resolution (Option C from grilling):** Separate pages.

**Routes:**
- `/:orgSlug/overview` — Executive dashboard (org health, sprints, recent activity)
- `/:orgSlug/people` — HR employee directory

**Why separate pages:** The executive and HR manager have fundamentally different needs. The executive wants metrics and trends. The HR manager wants people lists and individual profiles. Combining them on one page means both audiences scroll past irrelevant content. Separate pages mean each user goes directly to what they need.

**Navigation:** Both pages are accessible from the sidebar when viewing a specific org. The sidebar gains two new items: "Overview" and "People."

---

### Decision 2: Executive overview — what widgets?

**Question:** The executive has very limited time (5–15 min/day). What goes on the overview page to make a 30-second health check possible?

**Resolution (A + C + D from grilling):** Three widgets.

**Widget 1 — Org Health Summary:**
- Active sprints count: how many sprints are currently running across the org
- Overdue tasks count: how many tasks have passed their deadline and aren't done (red if > 0)
- Velocity trend: current sprint velocity compared to average of last 3 sprints (↑ improving, ↓ declining, → steady)

**Widget 2 — Sprint Delivery:**
- List of active and recently completed sprints
- Each sprint shows: name, status badge (active/completed), progress bar (% of planned SP completed), SP numbers, days remaining for active sprints
- Purpose: "Are my active sprints on track?"

**Widget 3 — Recent Activity:**
- Chronological feed of significant events across the org
- Shows: task completions (with SP), sprint completions, status changes, new org sessions started
- Grouped by day (Today, Yesterday, Earlier this week)
- Source: `audit_logs` table filtered by org
- Purpose: "What happened while I wasn't looking?"

**What's NOT on the overview page:**
- Detailed per-task lists (that's the Kanban view)
- Capacity utilization per person (that's the sprint capacity table)
- Individual employee metrics (that's the people page)

**Performance target:** Page must render in under 2 seconds. All three widgets load in parallel.

---

### Decision 3: Employee directory — basic or full data?

**Question:** The HR manager needs to see all employees across all workspaces. How much data goes in the directory table vs. the detail page?

**Resolution:** Basic columns in the directory table. Full details on the employee detail page.

**Directory table columns:**
- Name (clickable → employee detail page)
- Email
- Role (badge: Owner, Admin, Member)
- Workspaces (comma-separated list of workspace names the employee belongs to)
- Joined date (earliest `joinedAt` across all workspaces in this org)

**Directory controls:**
- Search: text input filtering by name or email (case-insensitive)
- Role filter: dropdown (All Roles, Owner, Admin, Member)
- Count display: "42 Members" showing current filtered count

**Past employees section:**
- Below the active employee table
- Header: "Past Employees"
- Employees who left the organization appear here with grayed-out styling
- Role badge shows "Former" instead of their old role
- Clickable to view historical data
- Behavior defined in CONTEXT.md line 89

**Data deduplication:** An employee in 3 workspaces appears as ONE row in the directory (not 3 rows). Their workspaces are aggregated. Their role is the highest across all workspaces (Owner > Admin > Member).

**What's NOT in the directory table (deferred to detail page):**
- Velocity data
- Capacity utilization
- Current task assignments
- Org session history

---

### Decision 4: Employee detail page — what goes on it?

**Question:** When HR clicks an employee name, what do they see beyond the existing profile page?

**Resolution:** Enhanced detail page at `/:orgSlug/people/:userId`.

**Sections on the page:**

1. **Header:** Name, email, role badge, joined date. Back button to directory.

2. **Velocity History:** Per-sprint breakdown table showing the employee's completed SP and task count for each sprint. Includes average SP/sprint. Last 8 sprints shown.

3. **Capacity Utilization:** For the current sprint and last 2 sprints: capacity hours, estimated hours assigned, utilization percentage. Overload warning (>100%) highlighted.

4. **Current Tasks:** Grouped by status (In Progress, To Do). Each task shows title, priority, story points, due date. Excludes "Done" tasks (those are in velocity history).

5. **Workspaces:** List of workspaces the employee belongs to, with their role in each.

**Data freshness:** All data is live. Velocity history updates as sprints complete and tasks are marked done. Capacity utilization updates as PM adjusts capacity or tasks are assigned.

---

### Decision 5: Navigation integration

**Question:** How do users discover and navigate to the new org-level pages?

**Resolution:** Sidebar expansion.

**When viewing a specific org** (`/:orgSlug/*`):

The sidebar shows:
- Home (per-org)
- Projects
- Velocity
- Overview (NEW)
- People (NEW)

**When on My Work** (`/`):

The sidebar shows:
- My Work
- (No org-specific items — no org is selected)

**Org switcher integration:**
- Switching orgs updates the active org store
- Sidebar refreshes to show the selected org's pages
- The org switcher and sidebar are independent — you can be on any org page and still see the full sidebar

---

## User Stories (L5 Scope)

### Executive Stories

| ID | Story | Acceptance |
|----|-------|------------|
| EX-01 | As an executive, I want a single dashboard showing org health so I can assess everything in 30 seconds. | Overview page loads. Three widgets visible. All metrics current. |
| EX-02 | As an executive, I want to see which sprints are on track and which are at risk so I know where to focus attention. | Sprint delivery widget shows progress bars with color coding. |
| EX-03 | As an executive, I want to see recent activity across the org so I know what happened without asking PMs. | Activity feed shows chronological events grouped by day. |
| EX-04 | As an executive, I want to drill into sprint details from the dashboard so I can investigate issues. | Click sprint → navigates to sprint board. |

### HR Stories

| ID | Story | Acceptance |
|----|-------|------------|
| HR-01 | As an HR manager, I want to see all employees in the org so I know who works here. | Directory renders. Search and role filters work. |
| HR-02 | As an HR manager, I want to search for employees by name so I can find people quickly. | Search input filters directory in real-time. |
| HR-03 | As an HR manager, I want to filter employees by role so I can see specific groups. | Role dropdown filters directory. |
| HR-04 | As an HR manager, I want to see past employees separately so I can access historical data without cluttering active employee views. | Past employees section at bottom. Grayed-out styling. |
| HR-05 | As an HR manager, I want to view an employee's velocity history so I can support performance conversations with data. | Detail page shows per-sprint velocity breakdown. |
| HR-06 | As an HR manager, I want to see an employee's capacity utilization so I can identify overload or underutilization. | Detail page shows capacity utilization for current + last 2 sprints. |
| HR-07 | As an HR manager, I want to see an employee's current tasks so I understand their workload. | Detail page shows current tasks grouped by status. |

---

## User Journey: Executive Morning Check

**7:00 AM — 30-Second Health Scan:**

1. Executive opens Saha on tablet. Lands on `/` (My Work) — not the right view.
2. Clicks org switcher → selects "Acme Corp." Navigates to `/:acme-corp`.
3. Sees sidebar has "Overview." Clicks it. Navigates to `/:acme-corp/overview`.
4. **Seconds 1–10:** Scans Org Health widget. "3 active sprints. 7 overdue tasks ⚠. Velocity ↑ 12%." Not great — overdue count is concerning.
5. **Seconds 10–20:** Scans Sprint Delivery widget. Sprint 5 at 80% with 2 days left. Sprint 6 at 45% with 10 days left. Both on track.
6. **Seconds 20–30:** Scans Recent Activity. "Yesterday: Sprint 4 completed (28/35 SP). Alex completed Dashboard redesign (8 SP). Sarah clocked 9h 15m."
7. Mental note: "Check with Jordan about those 7 overdue tasks." Closes app. Total: 30 seconds.

**Total interaction:** 30 seconds. One org switch, one sidebar click. No PM interruption needed.

---

## User Journey: HR Monthly Review

**Friday, 3:00 PM — Prepping for Performance Conversations:**

1. HR opens `/:acme-corp/people`. Sees directory: 42 active members, 1 past employee.
2. Searches "Sarah." Directory filters to Sarah Martinez.
3. Clicks Sarah's name → navigates to `/:acme-corp/people/sarah-martinez`.
4. Scrolls to Velocity History:
   - Sprint 4: 14 SP (5 tasks). Sprint 5: 8 SP (3 tasks) — drop.
   - "Sarah's velocity dropped in Sprint 5. Was she on PTO? Need to check capacity notes."
5. Checks Capacity Utilization. Sprint 5: Sarah had 24h capacity (was on PTO 2 days). Ah — that explains the drop.
6. Scrolls to Current Tasks: 2 in progress, 3 in todo. 28 estimated hours against 40h capacity. Healthy.
7. Notes for 1:1: "Velocity consistent except PTO week. Good workload balance. No overload concerns."
8. Goes back to directory to check next employee.

**Total interaction:** 3–4 minutes per employee. Data-driven, no PM interruption needed.

---

## Features Delivered

### Executive Overview Dashboard
- Route: `/:orgSlug/overview`
- Org Health Summary widget (active sprints, overdue, velocity trend)
- Sprint Delivery widget (progress bars, status indicators)
- Recent Activity widget (chronological feed, grouped by day)
- Click-through to sprint board and project detail
- Under 2 second load time

### Employee Directory
- Route: `/:orgSlug/people`
- Table with name, email, role, workspaces, joined date
- Search by name/email
- Filter by role
- Past employees section with grayed-out styling
- Click to employee detail page
- Deduplication by employee (one row per person, not per workspace)

### Enhanced Employee Detail Page
- Route: `/:orgSlug/people/:userId`
- Replaces existing `/:orgSlug/member/:userId` page
- Velocity history: per-sprint breakdown (8 sprints)
- Capacity utilization: current + last 2 sprints with overload warnings
- Current tasks: grouped by status
- Workspaces: list with roles
- Back button to directory

### Sidebar Enhancement
- "Overview" link added for org-scoped views
- "People" link added for org-scoped views
- Only visible when an org is selected (not on My Work)

---

## Routes Created/Affected

| Route | Status | Description |
|-------|--------|-------------|
| `/:orgSlug/overview` | NEW | Executive dashboard |
| `/:orgSlug/people` | NEW | Employee directory |
| `/:orgSlug/people/:userId` | NEW | Enhanced employee detail |
| `/:orgSlug/member/:uid` | REMOVED | Replaced by people/:userId |
| Sidebar layout | MODIFIED | Two new items added |

---

## Data Sources

| Widget/Page | Primary Data Source | Secondary |
|-------------|---------------------|-----------|
| Org Health — active sprints | `sprints` filtered by org | — |
| Org Health — overdue | `tasks` filtered by org, status ≠ done, deadline < now | — |
| Org Health — velocity trend | `sprints` completed in org | Compare current vs average |
| Sprint Delivery | `sprints` with status active or recently completed | `tasks` for SP counts |
| Recent Activity | `audit_logs` filtered by org | User names resolved from `users` |
| Employee Directory | `workspace_members` joined with `users` and `workspaces` | Aggregated by user |
| Employee Detail — velocity | `tasks` filtered by assignee + sprint | `sprints` for sprint names/dates |
| Employee Detail — capacity | `employee_capacity` for user | `tasks` for estimated hours sum |
| Employee Detail — tasks | `tasks` filtered by assignee, status ≠ done | `projects` for project names |

---

## Integration Points with Other Levels

### From L3:
- Velocity page data used for executive velocity trend
- Personal velocity data used for employee detail page

### From L2:
- Sprint completion snapshots feed sprint delivery widget
- Task auto-capture data feeds employee velocity history

### From L1:
- Active org context scopes all executive and HR views
- Org switcher enables navigation between org overviews

### From L4:
- Toast notifications for any errors loading dashboard/people data
- Keyboard shortcuts active on overview and people pages

---

## Edge Cases Catalog

| Edge Case | Resolution |
|-----------|------------|
| New org with 0 sprints | Health widget: "0 active sprints. Velocity: N/A." Sprint delivery: "Create your first sprint." |
| New org with 0 employees (just the owner) | People page: "1 member" — just the owner. |
| Employee in 5 workspaces | Directory shows all 5 workspace names. Row might be wider. Aggregated. |
| Employee left 3 months ago | Appears in Past Employees section. Historical data preserved. |
| Audit log has 10,000+ entries | Recent activity shows last 50 events only. Pagination deferred. |
| Executive has no Workspace membership for a project's workspace | Executive sees org-level data from all workspaces regardless of membership (they own the org). |
| Sprint delivery widget with 10+ active sprints | Widget scrolls. Only first 5 visible without scrolling. |
| Employee has never completed a sprint task | Velocity history shows "—" for each sprint. "No velocity data yet." |
| Employee was only active in a Workspace for 1 day | Joined date shows that day. Past employee section if they're gone. |
| Two orgs with identical employee names | Directory shows emails for disambiguation. Same as Workspace member dropdown. |
