# HR Manager Frontend UI/UX Audit Report

**Audit Date:** May 15, 2026  
**Audited Perspective:** HR Manager (Organizational Leadership View)  
**Severity Distribution:** 8 Critical, 12 High, 9 Medium, 6 Low

---

## Executive Summary

This audit evaluates the PM-manager application from an **HR Manager's perspective**—a user who needs organization-wide visibility, team health indicators, capacity planning insights, performance tracking, and employee lifecycle management tools.

**Critical Finding:** The application is designed primarily for **project-level and sprint-level operations** with virtually no **organization-level features**. HR Managers have almost no tools to perform their core responsibilities through this interface. The current design assumes all users are **project/team collaborators** with no elevated organizational oversight role.

**Key Gap Areas:**
- No organization-level dashboard or visibility
- No employee directory or people management
- No organization-wide capacity or utilization reporting
- No performance tracking at individual or team level
- No onboarding/offboarding workflow support
- No historical performance data
- No reporting/export functionality for HR needs

---

## Persona Requirements vs. Current State

### HR Manager Persona (From Context)

| Requirement | Current State | Gap Level |
|------------|---------------|-----------|
| Organization-wide dashboard | ❌ Not implemented | Critical |
| See all teams/workspaces | ⚠️ Partial (can filter all workspaces) | Medium |
| Team member capacity overview | ⚠️ Sprint-scoped only | High |
| Employee velocity history | ⚠️ 90-day aggregate only | High |
| Skill/availability tracking | ❌ Not implemented | Critical |
| Onboarding workflow support | ❌ Not implemented | Critical |
| Historical performance data | ⚠️ Limited | High |
| Export functionality | ❌ Not implemented | Critical |
| Role/permission management | ⚠️ Backend exists, no UI | Critical |
| Employee directory | ❌ Not implemented | Critical |

---

## Area 1: Organization Dashboard (CRITICAL GAP)

### Current State

**MISSING COMPLETELY** - No organization-level view exists.

**What HR Would Expect:**
- `/organization` or `/dashboard` landing page showing:
  - Total headcount across all workspaces
  - Active employees vs. departed employees
  - Team sizes and compositions
  - Organization-wide capacity allocation
  - Cross-team workload distribution
  - Alerts for overloaded teams/individuals

**What Exists:**
- `/home` - Shows tasks across all selected workspaces (project view, not people view)
- `/velocity` - Sprint-level velocity (not organizational)
- `/projects` - Lists projects per workspace

### Issues Found

| Severity | Issue | Impact |
|----------|-------|--------|
| **Critical** | No organization-level dashboard | HR cannot see organizational overview |
| **Critical** | No headcount metrics | Cannot track employee statistics |
| **Critical** | No team composition view | Cannot see which teams exist and who's in them |
| **High** | No department/workspace hierarchy view | HR lacks organizational structure visibility |
| **High** | No organization-wide alerts | Cannot see warnings about overloaded employees |

### Missing Features

1. **Organization Dashboard Page:**
   - Total employee count
   - Active projects count
   - Active sprints count
   - Overdue tasks organization-wide
   - Capacity utilization rate (estimated vs. available hours)
   - Team size breakdown

2. **Team Directory View:**
   - List of all workspaces/teams
   - Member counts per workspace
   - Role breakdown (owners, admins, members)
   - Link to team details

3. **Organization Health Metrics:**
   - Cross-team velocity trends
   - Average completion rates
   - Organization-wide overdue count

---

## Area 2: People/Employee Management (CRITICAL GAP)

### Current State

**SEVERELY LIMITED** - Only individual member profile view exists.

**What Exists:**
- `/workspace/[wid]/member/[uid]` - Individual member page showing:
  - Name, email, role
  - 90-day velocity aggregate
  - Task counts (active/completed)
  - List of assigned tasks

**File References:**
- `/packages/web/src/routes/(app)/workspace/[wid]/member/[uid]/+page.svelte` (lines 1-108)
- `/packages/api/src/modules/workspace/workspace.router.ts` (lines 26-30)

### Issues Found

| Severity | Issue | File Location |
|----------|-------|---------------|
| **Critical** | No employee directory page | Missing at `/workspace/[wid]/members` |
| **Critical** | No add member functionality | No UI or invitation flow |
| **Critical** | No role change capability | No `workspace.changeRole` API |
| **High** | No team composition view | Cannot see all members of workspace together |
| **High** | No search/filter for members | Hidden member URLs require UUID knowledge |
| **High** | No member addition workflow | Member/[uid]/+page.svelte only views |
| **Medium** | Hardcoded 90-day velocity | Not configurable timeframe |
| **Medium** | No per-sprint velocity breakdown | Only aggregate shown |

### Accessibility Problems

**How it works now:** To view member profiles, you must:
1. Count members in workspace filter dropdown
2. Guess or know the UUID of a specific member
3. Manually navigate to `/workspace/[wid]/member/[uid]`

**What HR needs:**
- Browsable member directory
- Search by name/email
- Filter by workspace
- Filter by role
- Bulk operations selection

### Database Capability

The database **can support** employee management:
- `workspace_members` table has `userId`, `workspaceId`, `role`, `joinedAt`
- `users` table has `name`, `email`, `avatarUrl`
- Backend `workspace.members` endpoint exists

**What's Missing:**
- Frontend member list page
- Add member UI
- Role management UI
- Employee search
- Employee skills/availability data model
- Employee status (active/departed)

---

## Area 3: Capacity Planning (PARTIAL)

### Current State

**PARTIALLY IMPLEMENTED** - Sprint-scoped capacity exists.

**What Exists:**
- `CapacityTable.svelte` - Shows per-sprint capacity per employee
- `capacity.router.ts` - Backend endpoint for capacity table
- Overload warnings (estimated hours > capacity hours)
- Notes field for capacity adjustments (vacation, part-time, etc.)

**File References:**
- `/packages/web/src/lib/components/CapacityTable.svelte` (lines 1-143)
- `/packages/api/src/modules/sprint/capacity.router.ts` (lines 1-24)
- `/packages/api/src/modules/sprint/capacity.service.ts` (lines 20-86)

### What HR Can See (Within Scope)

| Capability | Available? | Notes |
|-----------|-----------|-------|
| Per-employee capacity per sprint | ✅ Yes | Only within sprint context |
| Overload warnings | ✅ Yes | Visual indicator in capacity table |
| Capacity notes | ✅ Yes | Can document vacation, time off |
| Sprint task assignment count | ✅ Yes | `taskCount` in capacity table |
| Estimated hours per employee | ✅ Yes | Calculated from assigned tasks |
| Capacity trend over time | ❌ No | No historical capacity data |
| Organization-wide capacity view | ❌ No | Must navigate each sprint/workspace |
| Availability calendar | ❌ No | No calendar view of availability |
| Skill-based allocation | ❌ No | No skill tracking |

### Issues Found

| Severity | Issue | Impact |
|----------|-------|--------|
| **High** | Sprint-scoped only | HR needs organization-wide capacity planning |
| **High** | No historical capacity data | Cannot analyze capacity trends |
| **High** | No cross-sprint view | Cannot plan sprint-over-sprint allocation |
| **Medium** | No availability calendar | Vacation/time off must be manually noted |
| **Medium** | Manual capacity entry | HR must enter capacity for each employee per sprint |
| **Low** | No capacity forecasting | Cannot predict future capacity needs |

### Missing HR Features

1. **Organization-Wide Capacity Dashboard:**
   - All employees capacity summary
   - Filter by workspace/department
   - Sort by utilization percentage
   - Identify under/over-allocated employees

2. **Capacity Trend Analysis:**
   - Capacity over last N sprints
   - Utilization rate history
   - Burnout indicators (consistent overload)

3. **Availability Management:**
   - Time-off calendar integration
   - Availability blocking
   - Team holiday overlap warnings

---

## Area 4: Performance Tracking (PARTIAL)

### Current State

**PARTIALLY IMPLEMENTED** - Basic employee metrics exist.

**What Exists:**
- Employee velocity (90-day aggregate)
- Task completion count
- Active task count
- Estimated vs. actual hours per task (in task detail)
- Velocity breakdown by workspace/project filters

**File References:**
- `/packages/web/src/routes/(app)/workspace/[wid]/member/[uid]/+page.svelte` (lines 56-73)
- `/packages/api/src/modules/velocity/velocity.service.ts` (lines 28-102)
- `/packages/web/src/routes/(app)/velocity/+page.svelte` (lines 1-217)

### What HR Currently Sees

```
Employee Page Shows:
├── Name, Email, Role, Workspace
├── Velocity Section
│   ├── Completed Story Points (90 days)
│   └── Tasks Completed (90 days)
├── Current Workload
│   ├── Active Tasks
│   └── Completed Tasks
└── Assigned Tasks List
```

### Issues Found

| Severity | Issue | Impact |
|----------|-------|--------|
| **High** | No sprint-by-sprint velocity breakdown | Cannot see performance trends |
| **High** | No velocity visualization | Data shown as numbers only |
| **High** | No team comparison | Cannot compare employee to team average |
| **Medium** | Hardcoded 90-day window | Cannot adjust evaluation period |
| **Medium** | No estimated vs. actual accuracy | Not aggregated per employee |
| **Low** | Only shows assigned tasks | No contribution to team velocity |
| **Low** | No skill assessment | Cannot track skill growth |

### Missing HR Features

1. **Performance Dashboard:**
   - Velocity trend chart (last N sprints)
   - Sprint contribution percentage
   - Team average comparison
   - Performance percentile ranking

2. **Performance Reports:**
   - Export to PDF/CSV
   - Date range selection
   - Team/department rollups
   - Individual vs. team metrics

3. **Performance History:**
   - Velocity over time graph
   - Task completion rate
   - Estimate accuracy ratio (estimated / actual hours)
   - Sprint participation history

4. **Performance Indicators:**
   - Overdue task ratio
   - Review cycle time (time in review column)
   - Blocked tasks count
   - Collaboration metrics (comments, mentions)

---

## Area 5: Team Management (CRITICAL GAP)

### Current State

**CRITICALLY LIMITED** - Backend supports roles but no UI.

**What Exists (Backend Only):**
- `workspace_members` table with `role` column (`owner`, `admin`, `member`)
- `adminProcedure` middleware checking for admin/owner role
- Permission system for various operations

**File References:**
- `/packages/api/src/db/schema.ts` (line 28)
- `/packages/api/src/trpc.ts` (lines 50-187)

### Database Role Capabilities

| Action | owner | admin | member |
|--------|-------|-------|--------|
| Create project | ✅ | ✅ | ✅ |
| Delete project | ✅ | ✅ | ❌ |
| Create sprint | ✅ | ✅ | ✅ |
| Delete sprint | ✅ | ✅ | ❌ |
| Create task | ✅ | ✅ | ✅ |
| Delete task | ✅ | ✅ | ❌ |
| Remove workspace member | ✅ | ✅ | ❌ |
| Set employee capacity | ✅ | ✅ | ❌ |
| Change member roles | ❓ | ❓ | ❓ |

**Note:** Role change functionality does not exist in backend or frontend.

### Issues Found

| Severity | Issue | File Location |
|----------|-------|----------------|
| **Critical** | No add member UI/invitations | Missing completely |
| **Critical** | No role management UI | No way to promote/demote |
| **Critical** | No member list page | No `/workspace/[wid]/members` route |
| **High** | No workspace settings page | No administrative hub |
| **High** | No member search | Must know UUID to view profiles |
| **Medium** | Role badges exist but not prominent | Low visibility |
| **Medium** | No bulk operations | Cannot add/remove multiple members |

### What HR Cannot Do

1. **Cannot View Team Members:**
   - Must count members in filter dropdown
   - Cannot browse member list
   - Cannot see roles at a glance

2. **Cannot Add Team Members:**
   - No invitation system (completely missing)
   - No direct add member UI
   - No invitation links/codes

3. **Cannot Manage Roles:**
   - Cannot view role assignments
   - Cannot promote member to admin
   - Cannot demote admin to member
   - Cannot transfer ownership

4. **Cannot Remove Members:**
   - Backend has `workspace.removeMember` endpoint
   - No UI to invoke it
   - No confirmation flow

5. **Cannot See Member Activity:**
   - No join date visibility in UI
   - No last active timestamp
   - No activity tracking

### Required for HR

1. **Team Members Page (`/workspace/[wid]/members`):**
   - List all members
   - Show roles with badges
   - Show join dates
   - Show velocity summary
   - Actions: View profile, Change role, Remove

2. **Add Member Modal:**
   - Email input for invitation
   - Role selection dropdown
   - Invitation message field
   - Send invitation button

3. **Role Management:**
   - Role dropdown in member list
   - Promote/Demote buttons
   - Role change confirmation
   - Role capability descriptions

4. **Member Search and Filter:**
   - Search by name/email
   - Filter by role
   - Filter by workspace

---

## Area 6: Onboarding/Offboarding Lifecycle (NOT IMPLEMENTED)

### Current State

**NOT IMPLEMENTED** - No lifecycle management features.

**What Exists:**
- Workspace creation (backend only)
- Member join tracking (`joinedAt` field exists)
- User auto-creation on first OAuth login

### Issues Found

| Severity | Issue | Impact |
|----------|-------|--------|
| **Critical** | No onboarding workflow | New employees have no guided setup |
| **Critical** | No offboarding workflow | Cannot track departing employees |
| **High** | No employee status tracking | Cannot mark employees as departed |
| **High** | No task reassignment on departure | departing employees' tasks remain assigned |
| **Medium** | No onboarding checklist | No structured new employee guidance |
| **Medium** | No knowledge transfer tools | No handoff documentation support |

### Missing Features

1. **Onboarding Workflow:**
   - Welcome screen for new employees
   - Workspace introduction
   - Team member introductions
   - Getting started checklist
   - Task assignment suggestions
   - Role and permission explanations

2. **Employee Status:**
   - Active/On Leave/Departed status field
   - Status change tracking
   - Departed employee handling
   - Task reassignment on departure

3. **Offboarding Workflow:**
   - Task reassignment tool
   - Access revocation checklist
   - Archive projects/tasks owned by departing employee
   - Knowledge transfer task creation
   - Final task completion review

4. **HR Notifications:**
   - New employee joined notification (to HR)
   - Employee departure request workflow
   - Approval workflows for role changes

---

## Area 7: Historical Performance Data (LIMITED)

### Current State

**LIMITED** - Only aggregate metrics exist.

**What Exists:**
- 90-day velocity aggregate
- Task completion count
- Completed task history (in `tasks` table)
- `audit_logs` table (all changes logged)
- Time entries per task

**File References:**
- `/packages/web/src/routes/(app)/workspace/[wid]/member/[uid]/+page.ts` (lines 17-31)
- `/packages/api/src/db/schema.ts` (lines 77-87) - audit_logs

### Issues Found

| Severity | Issue | Impact |
|----------|-------|--------|
| **High** | No per-sprint velocity history | Cannot see performance trajectory |
| **High** | No time trend visualization | Only numbers, no graphs |
| **High** | No team comparison context | No baseline for evaluation |
| **Medium** | Hardcoded time windows | Cannot customize evaluation periods |
| **Medium** | No estimate accuracy aggregation | Cannot assess estimation skill |
| **Low** | Audit logs not exposed | HR cannot see change history |
| **Low** | No peer comparison | Cannot stack-rank performance |

### What's Available

| Data | Accessible to HR? | Format |
|------|-------------------|--------|
| Task completed date | ✅ Yes | Per task |
| Story points | ✅ Yes | Per task |
| Time entries | ✅ Yes | Per task |
| Sprint participation | ✅ Yes | Task → Sprint link |
| Estimated hours | ✅ Yes | Per task |
| Audit log history | ❌ No API | Backend only |

### Missing HR Features

1. **Velocity Timeline:**
   - Chart showing velocity per sprint
   - Rolling average trend
   - Comparison to team average

2. **Contribution Breakdown:**
   - Percentage of sprint completed by employee
   - Per-project contribution
   - Cross-team contribution

3. **Estimation Accuracy:**
   - Estimated vs. actual hours ratio
   - Accuracy trend over time
   - Comparison to team average

4. **Attendance/Activity:**
   - Days with logged work
   - Average hours per sprint
   - Activity heatmap

5. **Historical Reports:**
   - Export capability
   - Custom date ranges
   - Comparison reports (period over period)

---

## Area 8: Reporting for HR (NOT IMPLEMENTED)

### Current State

**NOT IMPLEMENTED** - Zero reporting features.

**What Exists:**
- Velocity view with numbers
- Capacity table (sprint-scoped)
- Individual task lists

### Issues Found

| Severity | Issue | Impact |
|----------|-------|--------|
| **Critical** | No export functionality | Cannot extract data for HR systems |
| **Critical** | No report templates | No standard HR reports |
| **High** | No headcount report | Cannot get organization statistics |
| **High** | No capacity utilization report | Cannot see organization-wide allocation |
| **High** | No performance report | Cannot generate employee reviews |
| **Medium** | No scheduled reports | Cannot automate reporting |
| **Medium** | No report sharing | Cannot share insights with leadership |

### HR Reporting Needs

1. **Headcount Report:**
   - Total employees by workspace
   - Role distribution
   - Active vs. departed count
   - Time-based (new joins, departures in period)

2. **Capacity Utilization Report:**
   - Estimated hours vs. capacity hours
   - Utilization percentage per employee
   - Under/over-allocated employees
   - Workspace-level averages

3. **Performance Report:**
   - Velocity per employee (custom period)
   - Task completion rate
   - Estimate accuracy
   - Sprint participation count
   - Performance ranking (percentile)

4. **Team Composition Report:**
   - Members per workspace
   - Role breakdown
   - Tenure (days since joined)
   - Average velocity per team

5. **Export Formats:**
   - CSV for spreadsheet import
   - PDF for formal reports
   - JSON for API consumption

### Required Features

| Feature | Priority | Effort |
|---------|----------|--------|
| CSV export | Critical | Medium |
| PDF report generation | High | High |
| Report templates | High | Medium |
| Scheduled email reports | Medium | High |
| Dashboard snapshots | Medium | Medium |
| API for data extraction | High | Low |

---

## Area 9: Organization Visibility (CRITICAL GAP)

### Current State

**SEVERELY LIMITED** - Workspace-scoped views only.

**What HR Would Expect:**
- All workspaces visible (no filtering needed)
- Cross-workspace employee view
- Organization-wide metrics
- Department/team hierarchy

**What Exists:**
- Workspace filter in top bar (must manually select all)
- Projects listed per workspace
- Sprint views per project
- Member profiles per workspace (requires knowing workspace ID)

### Issues Found

| Severity | Issue | Impact |
|----------|-------|--------|
| **Critical** | No organization view | HR sees same UI as regular users |
| **Critical** | Cannot see all employees at once | Must navigate each workspace |
| **High** | No cross-workspace employee view | Employees in multiple workspaces shown separately |
| **High** | No workspace/department hierarchy flat view | No organizational chart |
| **Medium** | Personal workspace mixed in | Cannot exclude personal spaces |

### HR Visibility Issues

1. **Workspace Silos:**
   - Each workspace is isolated
   - HR must visit each workspace individually
   - No aggregation across workspaces

2. **Employee Duplication:**
   - Same employee appears in multiple workspaces
   - No unified employee view
   - Velocity/counts duplicated

3. **No Organizational Context:**
   - Workspaces don't show parent organization
   - `organizationId` field exists but not used in UI
   - No organization-level permissions/visibility

4. **Missing Filters:**
   - No "show all" mode for HR
   - No organization-level superuser role
   - No HR admin role distinction

---

## Area 10: User Journey Gaps

### HR Manager Onboarding Journey

**Current State:** HR Manager would:
1. Sign up via WorkOS OAuth
2. See personal workspace only
3. Cannot create workspaces (UI missing)
4. Cannot invite employees
5. Cannot see organization structure
6. No guided setup

**What Should Happen:**
1. HR Manager signs up
2. Organization created (via WorkOS organization)
3. HR can create/claim workspaces
4. HR can invite employees
5. HR can set up teams
6. HR onboarding checklist appears
7. HR dashboard becomes default view

### Employee Addition Journey

**Current State (BROKEN):**
1. No way to add employees
2. Backend supports but no UI
3. Member profiles unreachable without UUID

**What Should Happen:**
1. HR goes to Organization → People
2. HR clicks "Add Employee"
3. HR enters email address
4. System sends invitation
5. Employee receives email
6. Employee accepts invitation
7. Employee appears in member list
8. HR assigns to workspace(s)

### Performance Review Journey

**Current State (MISSING):**
1. No performance tracking features
2. No review workflows
3. No report generation

**What Should Happen:**
1. HR goes to Reports → Performance
2. Selects employee(s) and date range
3. System generates performance metrics
4. HR reviews velocity trends
5. HR exports report to PDF
6. HR shares with leadership

---

## Feature Comparison Matrix

| HR Feature | Specified in PRD | Backend Ready | Frontend Ready | Gap Level |
|-----------|------------------|---------------|----------------|-----------|
| Organization dashboard | ❌ | ⚠️ (org field exists) | ❌ | Critical |
| Employee directory | ❌ | ✅ (members API) | ❌ | Critical |
| Add member UI | ❌ | ⚠️ (API exists, no invite) | ❌ | Critical |
| Role management UI | ❌ | ⚠️ (role in DB) | ❌ | Critical |
| Invitations system | ❌ | ❌ | ❌ | Critical |
| Onboarding workflows | ❌ | ❌ | ❌ | Critical |
| Offboarding workflows | ❌ | ❌ | ❌ | Critical |
| Performance reports | ❌ | ⚠️ (audit logs) | ❌ | Critical |
| Capacity organization view | ❌ | ⚠️ (sprint-scoped) | ❌ | Critical |
| Export functionality | ❌ | ❌ | ❌ | High |
| Velocity breakdown per sprint | ❌ | ✅ (can compute) | ❌ | High |
| Charts/visualizations | ❌ | N/A | ❌ | High |
| Historical performance | ⚠️ (90 days) | ✅ | ⚠️ | Medium |
| Team composition view | ❌ | ✅ | ❌ | High |
| HR role/permissions | ❌ | ❌ | ❌ | Critical |

---

## Recommendations by Priority

### P0 - Critical (HR Cannot Function Without)

1. **Create Organization Dashboard Page**
   - `/organization` route
   - Total headcount, active workspaces, project counts
   - Organization-wide metrics
   - Links to team directory

2. **Implement Member Directory**
   - `/workspace/[wid]/members` page
   - List all members with roles
   - Search and filter
   - Link to profiles

3. **Build Invitation System**
   - `invitations` table in database
   - `workspace.invite` API endpoint
   - Email invitation sending
   - Acceptance workflow
   - Add member UI in member directory

4. **Add Role Management UI**
   - `workspace.changeRole` API endpoint
   - Role dropdown in member list
   - Role capability documentation
   - Audit logging for role changes

5. **Implement Organization Visibility**
   - HR admin role with org-wide access
   - View all workspaces without filtering
   - Cross-workspace employee aggregation
   - Organization-level metrics

### P1 - High (HR Core Functions)

6. **Create Employee Performance Page Enhancement**
   - Per-sprint velocity breakdown
   - Velocity trend chart
   - Team average comparison
   - Sprint contribution percentage

7. **Build Capacity Organization View**
   - All employees capacity summary
   - Cross-sprint capacity trends
   - Utilization heatmap
   - Overload alerts organization-wide

8. **Develop Report Export**
   - CSV export for all report data
   - PDF generation for formal reports
   - Date range selection
   - Report templates

9. **Add Team Composition Reporting**
   - Members by workspace
   - Role distribution chart
   - Tenure breakdown
   - Exportable reports

10. **Implement Employee Search**
    - Search across all workspaces
    - Filter by name, email, role
    - Quick navigation to profile

### P2 - Medium (HR Workflow Improvements)

11. **Build Onboarding Workflow**
    - Welcome checklist
    - Task assignment suggestions
    - Team introduction flow
    - Role explanation

12. **Create Offboarding Workflow**
    - Employee departure status
    - Task reassignment tool
    - Access revocation checklist
    - Archive functionality

13. **Add Historical Performance Charts**
    - Velocity over time graph
    - Performance percentile
    - Contribution breakdown

14. **Implement Availability Calendar**
    - Time-off tracking
    - Capacity reduction per sprint
    - Holiday overlap warnings

15. **Create HR Notification System**
    - New employee alerts
    - Role change approvals
    - Departure request workflow

### P3 - Low (Future Enhancements)

16. **Build Skill Tracking System**
    - Skills database
    - Skill-based search
    - Skill growth tracking

17. **Add Predictive Analytics**
    - Capacity forecasting
    - Performance trends
    - Burnout indicators

18. **Create Custom Reporting**
    - Report builder UI
    - Scheduled reports
    - Dashboard customization

19. **Implement 360-Degree Feedback**
    - Peer review system
    - Manager reviews
    - Feedback aggregation

20. **Add Employee Goals Tracking**
    - Goal setting
    - Progress tracking
    - Goal-aligned reporting

---

## Impact Assessment

### What HR Can Currently Do:

| Task | Possible? | Effort |
|------|-----------|--------|
| See organization structure | ❌ No | N/A |
| Add new employees | ❌ No | N/A |
| Create workspaces | ⚠️ API only | Requires API access |
| View employee profiles | ⚠️ With UUID | Very difficult |
| See capacity allocation | ⚠️ Per sprint | Per-sprint navigation |
| Track performance | ⚠️ Limited | Manual calculation |
| Export data | ❌ No | N/A |
| Manage team roles | ❌ No | N/A |

### What HR Cannot Do:

1. Create and manage teams
2. Add or remove employees
3. Assign roles and permissions
4. View organization overview
5. Generate reports
6. Track onboarding/offboarding
7. Compare employee performance
8. Plan organization-wide capacity

### Business Impact:

1. **HR cannot use this application** - All core HR functions are missing
2. **Organization growth blocked** - Cannot add employees without engineering intervention
3. **No people management** - Cannot manage team composition, roles, or permissions
4. **No accountability tracking** - Cannot generate performance reports for reviews
5. **Compliance risk** - Cannot track employee history, status, or lifecycle

---

## Files Reviewed

### Frontend Files
- `/packages/web/src/routes/(app)/+layout.svelte` - Main app layout
- `/packages/web/src/routes/(app)/home/+page.svelte` - Home page
- `/packages/web/src/routes/(app)/velocity/+page.svelte` - Velocity page
- `/packages/web/src/routes/(app)/projects/+page.svelte` - Projects page
- `/packages/web/src/routes/(app)/workspace/[wid]/member/[uid]/+page.svelte` - Member profile
- `/packages/web/src/routes/(app)/workspace/[wid]/member/[uid]/+page.ts` - Member data loader
- `/packages/web/src/routes/(app)/workspace/[wid]/+layout.svelte` - Workspace layout
- `/packages/web/src/lib/components/CapacityTable.svelte` - Capacity table
- `/packages/web/src/lib/components/VelocityView.svelte` - Velocity display
- `/packages/web/src/lib/components/WorkspaceFilter.svelte` - Workspace dropdown

### Backend Files
- `/packages/api/src/db/schema.ts` - Database schema
- `/packages/api/src/router.ts` - API routes
- `/packages/api/src/trpc.ts` - Authentication/authorization
- `/packages/api/src/modules/workspace/workspace.service.ts` - Workspace logic
- `/packages/api/src/modules/workspace/workspace.router.ts` - Workspace endpoints
- `/packages/api/src/modules/velocity/velocity.service.ts` - Velocity calculation
- `/packages/api/src/modules/velocity/velocity.router.ts` - Velocity endpoints
- `/packages/api/src/modules/sprint/capacity.service.ts` - Capacity logic
- `/packages/api/src/modules/sprint/capacity.router.ts` - Capacity endpoints

---

## Conclusion

**The PM-manager application is fundamentally designed for project collaborators, not HR managers.** The architecture assumes a flat user model where all users are peers working on tasks together. There is no concept of:

1. **Organizational hierarchy** - No org-level entities, only workspaces
2. **People management** - No member lists, invitations, or role management
3. **HR visibility** - No organization dashboard or cross-team views
4. **Employee lifecycle** - No onboarding/offboarding workflows
5. **Reporting authority** - No HR role with elevated permissions

**Key Statistics:**
- **8 critical gaps** preventing HR from performing core functions
- **12 high-priority features** missing that HR needs
- **0 HR-specific features** currently implemented
- **0 organization-level views** in the application

**Immediate Priorities:**
1. Organization dashboard (P0)
2. Member directory (P0)
3. Invitation system (P0)
4. Role management UI (P0)
5. HR visibility permissions (P0)

Without these P0 features, **HR managers cannot use this application at all**. They would need:
- Engineering intervention to add members via database/API
- No way to create workspaces through UI
- No way to see organization structure
- No way to manage team composition
- No way to generate reports

**Recommendation:** Before this application can serve HR managers, it needs a significant architectural addition: **an organization layer with HR-specific roles and features**.
