# Saha — Level 3: Visibility & Intelligence

**Version:** 1.0
**Date:** May 15, 2026
**Status:** Approved
**Theme:** Timesheet, velocity charts, estimation accuracy, personal velocity. From raw data to actionable insights.

---

## Objective

Transform the task completion data and org session data into meaningful, actionable views. The timesheet shows an engineer their work across time. Velocity charts show PMs sprint-by-sprint performance. Sprint estimation accuracy provides the feedback loop for better planning. Personal velocity gives engineers insight into their own contribution.

---

## 1. Timesheet View

### Data Source

All rendered from `org_sessions` and `tasks` tables. No new table needed — auto-enrichment from L2 populates everything.

### Organization

**Unified chronological table across all orgs, with org badges.**

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Timesheet                                                  May 12–16, 2026 │
├──────┬──────────┬───────────┬──────────┬───────────┬──────────┬───────────┤
│ Day  │ Org      │ Start     │ End      │ Duration  │ Tasks    │ SP        │
├──────┼──────────┼───────────┼──────────┼───────────┼──────────┼───────────┤
│ Mon  │ 🏢 Acme  │ 9:15 AM   │ 5:30 PM  │ 8h 15m    │ 5        │ 13        │
│ Mon  │ 💼 FLCo  │ 5:45 PM   │ 7:00 PM  │ 1h 15m    │ 1        │ 3         │
│ Tue  │ 🏢 Acme  │ 9:30 AM   │ 5:15 PM  │ 7h 45m    │ 4        │ 11        │
│ Wed  │ 🏢 Acme  │ 9:00 AM   │ 5:00 PM  │ 8h 00m    │ 6        │ 18        │
│ Wed  │ 💼 FLCo  │ 7:00 PM   │ 9:30 PM  │ 2h 30m    │ 2        │ 5         │
│ Thu  │ 🏢 Acme  │ 9:30 AM   │ 12:00 PM │ 2h 30m    │ 3        │ 8         │
├──────┴──────────┴───────────┴──────────┴───────────┴──────────┴───────────┤
│ WEEK TOTALS                              │ 30h 15m   │ 21       │ 58        │
└──────────────────────────────────────────────────────────────────────────┘
```

### Component Structure

```svelte
<!-- /packages/web/src/lib/components/TimesheetView.svelte -->
<script lang="ts">
  import { activeOrg } from '$lib/stores/active-org.svelte'
  
  let sessions = $state<OrgSession[]>([])
  let weekStart = $state<Date>(getWeekStart(new Date()))
  let isLoading = $state(false)
  
  async function loadSessions() {
    isLoading = true
    sessions = await trpc.orgSession.list.query({
      userId: $user.id,
      fromDate: weekStart,
      toDate: addDays(weekStart, 7),
    })
    isLoading = false
  }
  
  function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${h}h ${m}m`
  }
  
  function getOrgBadge(orgId: string): { name: string, color: string } {
    // Resolve from org store or fetched data
  }
  
  function weekTotals() {
    return sessions.reduce((acc, s) => ({
      tasks: acc.tasks + s.tasksCompleted,
      sp: acc.sp + Number(s.storyPointsCompleted),
      duration: acc.duration + ((s.endTime?.getTime() || Date.now()) - s.startTime.getTime()) / 1000,
    }), { tasks: 0, sp: 0, duration: 0 })
  }
</script>

{#if isLoading}
  <Spinner />
{:else}
  <table class="timesheet-table">
    <thead>
      <tr>
        <th>Day</th>
        <th>Org</th>
        <th>Start</th>
        <th>End</th>
        <th>Duration</th>
        <th>Tasks</th>
        <th>SP</th>
      </tr>
    </thead>
    <tbody>
      {#each sessions as session}
        <tr>
          <td>{formatDay(session.startTime)}</td>
          <td>
            <span class="org-badge" style="background: {getOrgBadge(session.organizationId).color}">
              {getOrgBadge(session.organizationId).name}
            </span>
          </td>
          <td>{formatTimeOnly(session.startTime)}</td>
          <td>{session.endTime ? formatTimeOnly(session.endTime) : '—'}</td>
          <td>{formatTime(getDuration(session))}</td>
          <td>{session.tasksCompleted}</td>
          <td>{Number(session.storyPointsCompleted)}</td>
        </tr>
      {/each}
    </tbody>
    <tfoot>
      <tr class="totals">
        <td colspan="4">Week Totals</td>
        <td>{formatTime(weekTotals().duration)}</td>
        <td>{weekTotals().tasks}</td>
        <td>{weekTotals().sp}</td>
      </tr>
    </tfoot>
  </table>
{/if}
```

### Features

- **Week navigation:** ← Previous Week / Next Week →
- **Date range:** Show current week by default
- **Live sessions:** Sessions with no `endTime` show elapsed time
- **Auto-created sessions:** Marked with a small badge "Auto" for system-generated entries
- **Frozen sessions:** Marked "Locked" if sprint has completed

---

## 2. Velocity Charts

### Sprint Velocity Bar Chart

**Purpose:** Compare planned vs completed story points per sprint.

**Data Source:** Sprint completion snapshots (computed at sprint end, stored in sprint row).

**Chart Type:** Grouped bar chart. One bar per sprint. Two bars per sprint (planned / completed).

```
Story Points
    │
 45 ┤  ┌────┐ ┌────┐          ┌────┐
    │  │    │ │    │          │████│
 30 ┤  │    │ │    │ ┌────┐   │████│
    │  │    │ │    │ │████│   │████│ ┌────┐
 15 ┤  │    │ │    │ │████│   │████│ │████│
    │  │    │ │    │ │████│   │████│ │████│
  0 ┼──┴────┴─┴────┴─┴────┴───┴────┴─┴────┴──
          Sprint 1  Sprint 2   Sprint 3  Sprint 4

    ┌────┐ = Planned (blue outline)
    │████│ = Completed (solid fill)
```

### Component Structure

```svelte
<!-- /packages/web/src/lib/components/VelocityChart.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'

  // We use a library or lightweight Canvas/SVG approach.
  // The goal: two grouped bars per sprint — planned and completed.
  
  let sprints = $state<VelocitySnapshot[]>([])
  
  async function loadVelocityData() {
    sprints = await trpc.velocity.history.query({
      organizationId: $activeOrg.id,
      count: 8, // last 8 sprints
    })
  }
  
  onMount(loadVelocityData)
</script>

<div class="velocity-chart">
  <canvas bind:this={canvasEl}></canvas>
  <!-- Legend -->
  <div class="legend">
    <span class="planned">Planned</span>
    <span class="completed">Completed</span>
  </div>
</div>
```

### Chart Library Decision

**To be decided during implementation.** Options:
- Chart.js (lightweight, canvas-based)
- Custom SVG with D3.js
- Simple CSS bar chart (if we want zero dependencies)
- Use Svelte's reactive declarations to compute bar heights directly in template

**Recommendation:** Start with a custom SVG implementation — no dependency, full control, works with Svelte reactivity. If we need more complex charts in the future, upgrade to Chart.js.

### Interaction

- Hover on bar: shows tooltip "Planned: 35 SP / Completed: 28 SP"
- Click on sprint bar: navigates to sprint detail
- Compare mode: overlay average velocity line

---

## 3. Sprint Estimation Accuracy

### Metrics Displayed

Located on the velocity page below the chart.

**Throughput Accuracy:**
```
Planned: 35 SP    Completed: 28 SP    Accuracy: 80%
```
- Formula: `actual SP completed / planned SP`
- Shows whether the team shipped what they committed to.

**Time Efficiency:**
```
Estimated: 120h    Actual Session: 95h    Efficiency: 126%
```
- Formula: `total estimatedHours of completed tasks / total org session hours`
- Shows whether estimates were realistic. Over 100% means estimates were too high. Under 100% means tasks took longer than expected.

**Per-Sprint Accuracy Trend:**
```
Sprint 1: 85%  →  Sprint 2: 92%  →  Sprint 3: 78%  →  Sprint 4: 95%
Avg: 88%    Best: 95% (Sprint 4)    Worst: 78% (Sprint 3)
```
- Shows whether estimation accuracy is improving or declining over time.
- Helps PM identify which sprints had estimation problems.

### Component

```svelte
<!-- /packages/web/src/lib/components/EstimationAccuracy.svelte -->
<script lang="ts">
  let metrics = $state({
    throughputAccuracy: 0,
    timeEfficiency: 0,
    accuracyTrend: [] as { sprint: string, accuracy: number }[],
  })
  
  function formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`
  }
  
  function trendDirection(): 'up' | 'down' | 'flat' {
    const values = metrics.accuracyTrend.map(t => t.accuracy)
    const first = values[0]
    const last = values[values.length - 1]
    if (last > first + 0.05) return 'up'
    if (last < first - 0.05) return 'down'
    return 'flat'
  }
</script>

<div class="estimation-accuracy">
  <h3>Estimation Accuracy</h3>
  
  <div class="metric-grid">
    <div class="metric-card">
      <span class="label">Throughput</span>
      <span class="value">{formatPercent(metrics.throughputAccuracy)}</span>
      <span class="description">Planned vs Completed SP</span>
    </div>
    
    <div class="metric-card">
      <span class="label">Time Efficiency</span>
      <span class="value">{formatPercent(metrics.timeEfficiency)}</span>
      <span class="description">Estimated vs Actual Hours</span>
    </div>
    
    <div class="metric-card trend">
      <span class="label">Trend</span>
      <span class="direction">
        {#if trendDirection() === 'up'}  ↑ Improving
        {:else if trendDirection() === 'down'}  ↓ Declining
        {:else}  → Steady
        {/if}
      </span>
    </div>
  </div>
</div>
```

---

## 4. Personal Velocity

### Location

Velocity page, as a collapsible section or a tab.

### Content

Per-sprint breakdown table showing the engineer's own contribution.

```
My Velocity                                  [Acme Corp]

Sprint        Tasks      SP Completed    Team Total    My Share
─────────────────────────────────────────────────────────────────
Sprint 1      4          12              35            34%
Sprint 2      6          15              28            54%
Sprint 3      3          8               40            20%
Sprint 4      5          14              32            44%
─────────────────────────────────────────────────────────────────
Average       4.5        12.25           33.75         38%
```

### Data Query

```typescript
async function getPersonalVelocity(userId: string, orgId: string): Promise<PersonalVelocity[]> {
  return await db
    .select({
      sprint: sprints.name,
      tasks: count(tasks.id),
      spCompleted: sum(tasks.storyPoints),
      sprintStart: sprints.startDate,
      sprintEnd: sprints.endDate,
    })
    .from(tasks)
    .innerJoin(sprints, eq(tasks.sprintId, sprints.id))
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .innerJoin(workspaces, eq(projects.workspaceId, workspaces.id))
    .where(
      and(
        eq(tasks.assigneeId, userId),
        eq(workspaces.organizationId, orgId),
        eq(tasks.status, 'done'),
        isNotNull(tasks.sprintId),
      )
    )
    .groupBy(sprints.id, sprints.name, sprints.startDate, sprints.endDate)
    .orderBy(sprints.startDate)
}
```

### Team Total Column

Computed as: `SELECT SUM(storyPoints) FROM tasks WHERE sprintId = :sprintId AND status = 'done'`

### My Share Column

Computed as: `personal SP completed / team SP completed * 100`

---

## 5. Auto-Enrichment Recomputation

### Scenario

Engineer clocks out at 5 PM, session auto-enriches with "5 tasks, 13 SP." At 5:30 PM, engineer realizes they forgot to mark one more task as done. They drag it to "done" retroactively.

### Behavior (Option A — Recompute)

When a task is marked "done" after an org session has already closed:

1. The system checks if the task's `completedAt` falls within an existing closed session
2. If yes, recomputes the session's enrichment fields
3. The session's `updatedAt` is set to the current time
4. If the sprint is still active, sprint metrics update
5. If the sprint is completed (frozen), the task completion is rejected with a message

**Backend Logic:**

```typescript
// Called when task status changes to "done"
async function onTaskCompleted(taskId: string) {
  const task = await getTask(taskId)
  
  // Find the org session that covers this completion
  const session = await db
    .select()
    .from(orgSessions)
    .where(
      and(
        eq(orgSessions.userId, task.assigneeId),
        eq(orgSessions.organizationId, task.project.workspace.organizationId),
        gte(task.completedAt, orgSessions.startTime),
        or(
          isNull(orgSessions.endTime),
          lte(task.completedAt, orgSessions.endTime)
        )
      )
    )
    .orderBy(desc(orgSessions.startTime))
    .limit(1)
  
  if (session) {
    if (session.frozen) {
      throw new Error('Session is frozen (sprint completed). Cannot update.')
    }
    
    // Recompute enrichment
    await recomputeSessionEnrichment(session.id)
  } else {
    // Auto-create a minimal session
    await createAutoSession(task)
  }
}
```

---

## Views Integration

### Velocity Page (`/:orgSlug/velocity`)

The velocity page becomes the central hub for L3 data:

```
┌─────────────────────────────────────────────────────────────────┐
│  Velocity  ← Acme Corp                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Live] [Snapshot] [Custom]  ← Mode selector                    │
│                                                                  │
│  ┌─────────────────────────────┐                                │
│  │    Sprint Velocity Chart    │                                │
│  │    (bar chart: planned      │                                │
│  │     vs completed per sprint)│                                │
│  └─────────────────────────────┘                                │
│                                                                  │
│  ┌─────────────────────────────┐                                │
│  │    Estimation Accuracy      │                                │
│  │    Throughput │ Time Eff │ Trend │                           │
│  └─────────────────────────────┘                                │
│                                                                  │
│  ┌─────────────────────────────┐                                │
│  │    My Velocity              │                                │
│  │    (per-sprint breakdown    │                                │
│  │     table with personal SP) │                                │
│  └─────────────────────────────┘                                │
│                                                                  │
│  ┌─────────────────────────────┐                                │
│  │    Flagged Tasks            │                                │
│  │    (list of flagged tasks   │                                │
│  │     for selected sprint)    │                                │
│  └─────────────────────────────┘                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Velocity (New/Modified)

```
GET  /api/trpc/velocity.history         → Get sprint velocity history for charts
GET  /api/trpc/velocity.personal        → Get personal velocity breakdown
GET  /api/trpc/velocity.accuracy        → Get estimation accuracy metrics
```

### Org Sessions (Modified)

```
GET  /api/trpc/orgSession.timesheet    → Get user's timesheet data for date range
POST /api/trpc/orgSession.recompute    → Recompute enrichment for a session
```

---

## Testing Requirements

### Unit Tests

- [ ] Timesheet renders sessions in chronological order
- [ ] Timesheet calculates week totals correctly
- [ ] Velocity bar chart renders correct number of bars
- [ ] Bar heights proportional to story points
- [ ] Estimation accuracy computes correctly
- [ ] Time efficiency formula: estimatedHours / sessionHours
- [ ] Throughput accuracy formula: completedSP / plannedSP
- [ ] Personal velocity filters by assignee correctly
- [ ] Recomputation updates enrichment fields

### Integration Tests

- [ ] Timesheet respects date range filter
- [ ] Week navigation moves to correct weeks
- [ ] Chart updates when sprint data changes
- [ ] Personal velocity shows correct team share percentage
- [ ] Frozen sessions reject recomputation
- [ ] Auto-created sessions visible in timesheet

### E2E Tests

- [ ] Engineer can view their timesheet for the current week
- [ ] PM can see velocity chart with sprint comparison
- [ ] PM can see estimation accuracy metrics
- [ ] Engineer can see their personal velocity breakdown
- [ ] Navigation between timesheet and velocity views works

---

## Dependencies

- L0 (Foundation) must be complete
- L1 (Multi-Org Core) must be complete
- L2 (Task & Sprint Flow) must be complete
- `org_sessions` auto-enrichment functional
- Sprint completion snapshots stored

---

## Deliverables

1. ✅ Timesheet view component
2. ✅ Week navigation (previous/next)
3. ✅ Unified chronological table across orgs
4. ✅ Velocity bar chart component
5. ✅ Sprint comparison (planned vs completed)
6. ✅ Throughput accuracy metric
7. ✅ Time efficiency metric
8. ✅ Accuracy trend tracking
9. ✅ Personal velocity breakdown table
10. ✅ Team share percentage per sprint
11. ✅ Auto-enrichment recomputation logic
12. ✅ Frozen session protection
13. ✅ Velocity page redesigned with all L3 components

---

## Next Level

L3 transforms raw data into actionable insights. L4 (Collaboration & Polish) builds on this by adding @mentions, markdown descriptions, keyboard shortcuts, accessibility fixes, and error handling.
