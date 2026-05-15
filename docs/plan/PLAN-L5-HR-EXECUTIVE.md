# Saha — Level 5: HR & Executive

**Version:** 1.0
**Date:** May 15, 2026
**Status:** Approved
**Theme:** Organization dashboard, employee directory, HR visibility. The "company pays" version.

---

## Objective

Build the organization-level views that make a company pay for Saha. The executive gets a 30-second health check dashboard. The HR manager gets an employee directory and workforce visibility. This level converts the individual adoption into company-wide adoption.

---

## Architecture

### Route Structure

```
/:orgSlug/overview  → Executive overview dashboard
/:orgSlug/people    → HR employee directory
```

**Separate pages, not role-based views.** Users navigate to the page they need. Executive uses `/overview`. HR uses `/people`. PMs and admins can access both.

---

## 1. Executive Overview Dashboard

**Route:** `/:orgSlug/overview`

**Purpose:** 30-second organizational health scan. The first page an executive opens in the morning.

### Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  Overview  ← Acme Corp                                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────┐  ┌─────────────────────┐                   │
│  │  ORG HEALTH          │  │  SPRINT DELIVERY    │                   │
│  │                      │  │                      │                   │
│  │  3 Active Sprints    │  │  Sprint 5          │                   │
│  │  7 Overdue Tasks     │  │  ████████░░ 80%    │                   │
│  │  Velocity ↑ 12%      │  │  Sprint 4 Complete │                   │
│  │                      │  │  ██████████ 100%   │                   │
│  └─────────────────────┘  └─────────────────────┘                   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  RECENT ACTIVITY                                              │    │
│  │                                                               │    │
│  │  Today                                                       │    │
│  │  ─────                                                       │    │
│  │  9:30 AM  Sarah clocked into Acme Corp                      │    │
│  │  10:15 AM  "Fix login bug" marked Done by Alex (3 SP)       │    │
│  │  11:00 AM  "API rate limit" moved to Review by Ahmed        │    │
│  │                                                               │    │
│  │  Yesterday                                                   │    │
│  │  ─────────                                                   │    │
│  │  4:30 PM  Sprint 5 completed (28/35 SP)                     │    │
│  │  2:00 PM  "Dashboard redesign" marked Done by Sarah (8 SP)   │    │
│  │  ...                                                         │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### Widget 1: Org Health Summary

**Data:**

| Metric | Source | Display |
|--------|--------|---------|
| Active sprints | `SELECT COUNT(*) FROM sprints WHERE status = 'active' AND organization_id = :orgId` | "3 Active Sprints" |
| Overdue tasks | `SELECT COUNT(*) FROM tasks WHERE status != 'done' AND deadline < NOW() AND organization_id = :orgId` | "7 Overdue Tasks" (red if > 0) |
| Velocity trend | Compare current sprint velocity to average of last 3 sprints | "↑ 12%" (green if positive, red if negative) |

**Component:**

```svelte
<!-- /packages/web/src/lib/components/executive/OrgHealthSummary.svelte -->
<script lang="ts">
  let activeSprints = $state(0)
  let overdueCount = $state(0)
  let velocityTrend = $state({ direction: 'up' as 'up' | 'down' | 'flat', percentage: 0 })
  
  async function load() {
    const health = await trpc.organization.health.query({
      organizationId: $activeOrg.id,
    })
    activeSprints = health.activeSprints
    overdueCount = health.overdueTasks
    velocityTrend = health.velocityTrend
  }
</script>

<div class="widget org-health">
  <h3>Org Health</h3>
  
  <div class="health-metrics">
    <div class="metric">
      <span class="value">{activeSprints}</span>
      <span class="label">Active Sprints</span>
    </div>
    
    <div class="metric" class:critical={overdueCount > 0}>
      <span class="value">{overdueCount}</span>
      <span class="label">Overdue Tasks</span>
      <span class="alert">⚠</span>
    </div>
    
    <div class="metric trend" class:positive={velocityTrend.direction === 'up'} class:negative={velocityTrend.direction === 'down'}>
      <span class="value">
        {#if velocityTrend.direction === 'up'}↑
        {:else if velocityTrend.direction === 'down'}↓
        {:else}→
        {/if}
        {velocityTrend.percentage}%
      </span>
      <span class="label">Velocity</span>
    </div>
  </div>
</div>
```

### Widget 2: Sprint Delivery

**Data from active and recently completed sprints.**

```svelte
<!-- /packages/web/src/lib/components/executive/SprintDelivery.svelte -->
<script lang="ts">
  let sprints = $state<{
    id: string
    name: string
    status: 'active' | 'completed'
    progress: number  // 0-100
    plannedSP: number
    completedSP: number
    daysRemaining: number
  }[]>([])
</script>

<div class="widget sprint-delivery">
  <h3>Sprint Delivery</h3>
  
  {#each sprints as sprint}
    <div class="sprint-row" class:active={sprint.status === 'active'} class:completed={sprint.status === 'completed'}>
      <div class="sprint-header">
        <span class="name">{sprint.name}</span>
        <span class="status-badge">{sprint.status}</span>
      </div>
      
      <div class="progress-bar">
        <div class="fill" style="width: {sprint.progress}%"></div>
      </div>
      
      <div class="details">
        <span>{sprint.completedSP}/{sprint.plannedSP} SP</span>
        {#if sprint.status === 'active'}
          <span>{sprint.daysRemaining} days left</span>
        {/if}
      </div>
    </div>
  {/each}
</div>
```

### Widget 3: Recent Activity

**Real-time activity feed aggregated across the org.**

```typescript
// Backend: Aggregated activity feed
async function getRecentActivity(organizationId: string, limit = 20): Promise<ActivityEvent[]> {
  return await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      userId: auditLogs.userId,
      oldValue: auditLogs.oldValue,
      newValue: auditLogs.newValue,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(eq(auditLogs.entityType, sql`ANY(ARRAY['task', 'sprint', 'project'])`))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
}
```

**Display Logic:**

```svelte
<!-- /packages/web/src/lib/components/executive/RecentActivity.svelte -->
<script lang="ts">
  let activities = $state<ActivityEvent[]>([])
  
  function formatEvent(event: ActivityEvent): string {
    const userName = getUserName(event.userId)
    const entityName = getEntityName(event.entityType, event.entityId)
    
    switch (event.action) {
      case 'status_changed':
        return `${userName} moved "${entityName}" from ${event.oldValue} to ${event.newValue}`
      case 'created':
        return `${userName} created ${event.entityType} "${entityName}"`
      case 'completed':
        return `${userName} marked "${entityName}" Done (${event.newValue} SP)`
      case 'deleted':
        return `${userName} deleted ${event.entityType} "${entityName}"`
      default:
        return `${userName} ${event.action} ${event.entityType} "${entityName}"`
    }
  }
  
  function groupByDay(events: ActivityEvent[]): Map<string, ActivityEvent[]> {
    const groups = new Map<string, ActivityEvent[]>()
    for (const event of events) {
      const day = formatDay(event.createdAt)
      if (!groups.has(day)) groups.set(day, [])
      groups.get(day)!.push(event)
    }
    return groups
  }
</script>

<div class="widget recent-activity">
  <h3>Recent Activity</h3>
  
  {#each [...groupByDay(activities)] as [day, events]}
    <div class="day-group">
      <h4 class="day-label">{day}</h4>
      {#each events as event}
        <div class="activity-item">
          <span class="time">{formatTime(event.createdAt)}</span>
          <span class="description">{formatEvent(event)}</span>
        </div>
      {/each}
    </div>
  {/each}
</div>
```

---

## 2. Employee Directory

**Route:** `/:orgSlug/people`

**Purpose:** HR manager can see all employees across all workspaces in the organization.

### Directory Table (Basic View)

```
┌──────────────────────────────────────────────────────────────────────┐
│  People  ← Acme Corp                                   42 Members   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  [Search...]  [All Roles ▾]  [All Workspaces ▾]                    │
│                                                                       │
│  Name              Email                Role     Workspaces   Joined  │
│  ────────────────────────────────────────────────────────────────── │
│  Alexandra Chen     alex@acme.com       Owner    Dev, Mktg     Jan 12 │
│  Jordan Smith       jordan@acme.com     Admin    Dev Team      Feb 3  │
│  Alex Chen          alex.c@acme.com     Member   Dev Team      Mar 1  │
│  Sarah Martinez     sarah@acme.com      Member   Dev, Mktg     Mar 15 │
│  Ahmed Hassan       ahmed@acme.com      Member   Dev Team      Apr 2  │
│  ...                                                                  │
│                                                                       │
│  ─── Past Employees ───────────────────────────────────────────── │
│                                                                       │
│  Fatima Ali         fatima@acme.com     Former   Dev Team      Sep 8  │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**Table Columns:**

| Column | Source | Format |
|--------|--------|--------|
| Name | `users.name` | Text, clickable → employee detail page |
| Email | `users.email` | Text |
| Role | `workspace_members.role` | Badge: Owner, Admin, Member, Former |
| Workspaces | Aggregate of all `workspace_members` for this user | Comma-separated list |
| Joined | `workspace_members.joinedAt` (earliest) | Date |

**Past Employees:**
Per CONTEXT.md: departed employees appear at bottom with grayed-out style, grouped under "Past Employees."

### Component

```svelte
<!-- /packages/web/src/routes/[orgSlug]/people/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation'
  
  let members = $state<Member[]>([])
  let search = $state('')
  let roleFilter = $state<'all' | 'owner' | 'admin' | 'member' | 'former'>('all')
  let isLoading = $state(true)
  
  async function loadMembers() {
    isLoading = true
    const result = await trpc.organization.members.query({
      organizationId: $activeOrg.id,
      search: search || undefined,
      role: roleFilter === 'all' ? undefined : roleFilter,
    })
    members = result
    isLoading = false
  }
  
  function goToMember(member: Member) {
    // Navigate to employee detail page
    goto(`/${$activeOrg.slug}/people/${member.userId}`)
  }
  
  // Separate active and past employees
  let activeMembers = $derived(members.filter(m => m.status === 'active'))
  let pastMembers = $derived(members.filter(m => m.status === 'former'))
</script>

<div class="people-page">
  <header>
    <h1>People</h1>
    <span class="count">{activeMembers.length} Members</span>
  </header>
  
  <div class="filters">
    <input
      type="text"
      bind:value={search}
      on:input={loadMembers}
      placeholder="Search members..."
    />
    <select bind:value={roleFilter} on:change={loadMembers}>
      <option value="all">All Roles</option>
      <option value="owner">Owner</option>
      <option value="admin">Admin</option>
      <option value="member">Member</option>
    </select>
  </div>
  
  {#if isLoading}
    <Spinner />
  {:else}
    <table class="member-list">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Workspaces</th>
          <th>Joined</th>
        </tr>
      </thead>
      <tbody>
        {#each activeMembers as member}
          <tr onclick={() => goToMember(member)} class="clickable-row">
            <td class="name">{member.name}</td>
            <td class="email">{member.email}</td>
            <td>
              <span class="role-badge role-{member.role}">
                {member.role}
              </span>
            </td>
            <td class="workspaces">{member.workspaces.join(', ')}</td>
            <td class="joined">{formatDate(member.joinedAt)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    
    {#if pastMembers.length > 0}
      <h3 class="past-section-header">Past Employees</h3>
      <table class="member-list past-members">
        <tbody>
          {#each pastMembers as member}
            <tr onclick={() => goToMember(member)} class="clickable-row past">
              <td class="name">{member.name}</td>
              <td class="email">{member.email}</td>
              <td>
                <span class="role-badge role-former">Former</span>
              </td>
              <td class="workspaces">{member.workspaces.join(', ')}</td>
              <td class="joined">{formatDate(member.joinedAt)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  {/if}
</div>
```

---

## 3. Employee Detail Page (Enhanced)

**Route:** `/:orgSlug/people/:userId`

Extends the existing `/:orgSlug/member/:userId` page with full HR data.

### Content

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Back to People                                                   │
│                                                                       │
│  Sarah Martinez                                                      │
│  sarah@acme.com                                                      │
│  Member · Joined March 15, 2024                                      │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Velocity History                                             │    │
│  │                                                               │    │
│  │  Sprint 1: 12 SP (4 tasks)                                   │    │
│  │  Sprint 2: 15 SP (6 tasks)                                   │    │
│  │  Sprint 3: 8 SP (3 tasks)                                    │    │
│  │  Sprint 4: 14 SP (5 tasks)                                   │    │
│  │  ─────────────────────────────────────                       │    │
│  │  Average: 12.25 SP/sprint                                    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Capacity Utilization                                         │    │
│  │                                                               │    │
│  │  Current Sprint: 28h / 40h (70%)          [███████░░░]       │    │
│  │  Last Sprint:    35h / 40h (88%)          [████████░░]       │    │
│  │  Sprint -2:      42h / 40h (105%) ⚠      [██████████]       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Current Tasks                                                │    │
│  │                                                               │    │
│  │  In Progress (2):                                            │    │
│  │    · Fix login bug (P1, 3 SP, due May 18)                   │    │
│  │    · API refactor (P2, 5 SP, due May 20)                    │    │
│  │                                                               │    │
│  │  To Do (1):                                                  │    │
│  │    · Update docs (P3, 1 SP)                                  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Workspaces                                                   │    │
│  │    · Dev Team (Member)                                       │    │
│  │    · Marketing (Member)                                      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### Data Sources

| Section | Source | Query |
|---------|--------|-------|
| Velocity History | `tasks` grouped by `sprintId` | Per-sprint breakdown for this user |
| Capacity Utilization | `employee_capacity` + `org_sessions` | Capacity vs assigned hours, sprint-over-sprint |
| Current Tasks | `tasks` filtered by `assigneeId` | Grouped by status |
| Workspaces | `workspace_members` for this user | List with role per workspace |

---

## 4. API Endpoints

### Organization

```
GET  /api/trpc/organization.health      → Org health summary (active sprints, overdue, velocity trend)
GET  /api/trpc/organization.members     → Employee directory (paginated, filterable)
GET  /api/trpc/organization.member      → Employee detail (velocity history, capacity, tasks)
GET  /api/trpc/organization.settings    → Get org settings
PUT  /api/trpc/organization.settings    → Update org settings
```

### Backend Logic

```typescript
// /packages/api/src/modules/organization/organization.service.ts

async function getOrgHealth(organizationId: string): Promise<OrgHealth> {
  const [activeSprints, overdueTasks, velocityTrend] = await Promise.all([
    // Active sprints count
    db.select({ count: count() })
      .from(sprints)
      .innerJoin(projects, eq(sprints.projectId, projects.id))
      .innerJoin(workspaces, eq(projects.workspaceId, workspaces.id))
      .where(and(
        eq(workspaces.organizationId, organizationId),
        eq(sprints.status, 'active')
      )),
    
    // Overdue tasks
    db.select({ count: count() })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .innerJoin(workspaces, eq(projects.workspaceId, workspaces.id))
      .where(and(
        eq(workspaces.organizationId, organizationId),
        not(eq(tasks.status, 'done')),
        lt(tasks.deadline, new Date())
      )),
    
    // Velocity trend (current sprint vs average of last 3)
    computeVelocityTrend(organizationId),
  ])
  
  return {
    activeSprints: activeSprints[0].count,
    overdueTasks: overdueTasks[0].count,
    velocityTrend,
  }
}

async function getOrgMembers(organizationId: string, filters: MemberFilters): Promise<Member[]> {
  return await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.joinedAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(and(
      eq(workspaces.organizationId, organizationId),
      filters.role ? eq(workspaceMembers.role, filters.role) : undefined,
      filters.search ? ilike(users.name, `%${filters.search}%`) : undefined,
    ))
}
```

---

## 5. Navigation Integration

### Sidebar Update

Add "Overview" and "People" to the sidebar when viewing a specific org.

```svelte
<!-- /packages/web/src/routes/[orgSlug]/+layout.svelte -->
<script lang="ts">
  export let data
  
  let navItems = $derived([
    { label: 'Home', icon: Home, href: `/${data.org.slug}` },
    { label: 'Projects', icon: Layers, href: `/${data.org.slug}/projects` },
    { label: 'Velocity', icon: BarChart2, href: `/${data.org.slug}/velocity` },
    { label: 'Overview', icon: Activity, href: `/${data.org.slug}/overview` },
    { label: 'People', icon: Users, href: `/${data.org.slug}/people` },
  ])
</script>
```

---

## Testing Requirements

### Unit Tests

- [ ] Org health summary computes metrics correctly
- [ ] Sprint delivery shows correct progress bars
- [ ] Recent activity formats events correctly
- [ ] Employee directory filters by role
- [ ] Employee directory filters by search
- [ ] Past employees appear in separate section
- [ ] Employee detail page shows per-sprint velocity
- [ ] Employee detail page shows capacity utilization

### Integration Tests

- [ ] Executive overview loads within 2 seconds
- [ ] Employee directory pagination works
- [ ] Click on member name navigates to detail page
- [ ] Velocity history shows correct sprint breakdown
- [ ] Capacity utilization shows correct overload warnings

### E2E Tests

- [ ] Executive can scan org health in under 30 seconds
- [ ] HR can search for employees by name
- [ ] HR can filter employees by role
- [ ] HR can view employee detail including velocity history
- [ ] Past employees appear correctly at bottom

---

## Dependencies

- L0 (Foundation) must be complete
- L1 (Multi-Org Core) must be complete
- L2 (Task & Sprint Flow) must be complete
- L3 (Visibility & Intelligence) must be complete
- L4 (Collaboration & Polish) must be complete
- `organization_settings` table populated
- `org_sessions` data available for capacity computations

---

## Deliverables

1. ✅ Executive overview dashboard (`/:orgSlug/overview`)
2. ✅ Org Health Summary widget
3. ✅ Sprint Delivery widget
4. ✅ Recent Activity widget
5. ✅ Employee directory (`/:orgSlug/people`)
6. ✅ Directory table with search and filters
7. ✅ Past employees section
8. ✅ Enhanced employee detail page
9. ✅ Velocity history per sprint
10. ✅ Capacity utilization trends
11. ✅ Current tasks grouped by status
12. ✅ Workspaces with roles
13. ✅ Sidebar updated with Overview and People links
14. ✅ Organization API endpoints (health, members, settings)
