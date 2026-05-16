# Implementation Plan: L3 — Visibility & Intelligence

**Version:** 1.0  
**Date:** May 16, 2026  
**Status:** Ready for Implementation

---

## Key Design Decisions

### 1. Chosen Approach — Computed-on-Read Architecture

All L3 features are **read-only views** on existing data. No new database tables, no migrations. The timesheet computes from `org_sessions`. Velocity charts read from frozen `sprints` + `tasks`. Estimation accuracy derives from sprint data + session hours. This keeps L3 lightweight and non-invasive.

**Why this approach:**
- Zero schema changes = zero migration risk
- Faster iteration — data already exists from L0-L2
- Performance is acceptable for anticipated load (computed on-demand, can add caching later if needed)

### 2. Chart Library — Chart.js

`chart.js` + `svelte-chartjs` for the velocity bar chart. Lightweight (60KB), well-documented, good Svelte integration. Chosen over D3 (overkill), custom SVG (maintenance burden), and ECharts (heavy).

**Trade-off accepted:** Less visual customization than D3, but "good enough" for categorical bar charts.

### 3. Timesheet Routes — Two Routes, Shared Component

- `/:orgSlug/timesheet` — org-scoped timesheet
- `/timesheet` — unified timesheet across all orgs

Both use the same `TimesheetTable.svelte` component with different data filters. Org-scoped passes `organizationId` prop; unified omits it.

**Why not separate components:** Avoids duplication. Same table structure, same week navigation, same row layout — only the data query differs.

### 4. Velocity Page — Single Page with Collapsible Personal Section

Velocity chart + estimation accuracy metrics are always visible. Personal velocity is a collapsible section **expanded by default** (user preference). Clicking a sprint bar navigates to that sprint's board.

**Why not a tab:** Personal velocity is secondary content. It supplements the team velocity chart without requiring separate navigation.

### 5. Session Display — Table with Metadata Badges

Timesheet is a table with columns: Day, Org Badge, Start Time, End Time, Duration, Tasks Completed, SP Completed, Badge (Auto/Live/Frozen).

**Why not cards:** Tables are denser for week views (7–14 sessions). Easier to scan totals. Card layouts would require more vertical scrolling.

---

## Overall Success Criteria

After L3 is complete, the following will be true:

1. **Timesheet Works**
   - Engineer navigates to `/timesheet` (unified) or `/:orgSlug/timesheet` (org-scoped)
   - Sees a week's worth of org sessions, grouped by day
   - Can navigate to previous/next week
   - Sees live sessions with elapsed time, auto-created sessions with "Auto" badge, frozen sessions with lock icon
   - Week totals row shows total duration, tasks, and SP

2. **Velocity Chart Renders**
   - PM navigates to `/:orgSlug/velocity`
   - Sees a bar chart with last 8 completed sprints
   - Each sprint shows two bars: planned SP (outline) and completed SP (filled)
   - Hover shows exact values
   - Click on bar navigates to sprint board
   - Empty state shows when no completed sprints exist

3. **Estimation Accuracy Metrics Display**
   - Below the chart, three cards: Throughput Accuracy, Time Efficiency, Per-Sprint Accuracy Trend
   - Values are color-coded (green/yellow/red thresholds)
   - "N/A" shown for undefined values (e.g., planned = 0)

4. **Personal Velocity Breakdown**
   - Collapsible section under metrics (expanded by default)
   - Table shows per-sprint breakdown: sprint name, tasks completed, SP completed, team total SP, share %
   - "—" shown for sprints where user had zero tasks
   - Not included in average calculations

5. **No New Database Migrations**
   - L3 deploys with zero schema changes
   - All queries read from existing tables

---

## Explicitly Out of Scope

- **Timesheet Export (CSV/PDF)** — Deferred to L4 or later. User can query database directly if needed.
- **Timesheet Project Filtering** — Sessions are org-level, not project-level. No project filter.
- **Live Sprint Velocity** — Plan explicitly excluded active sprints from chart. Only completed sprints shown.
- **Velocity Comparison Across Orgs** — Would require cross-org sprint aggregation. Not requested.
- **Timezone Handling Beyond UTC** — All timestamps in UTC. Timezone display enhancement is future work.
- **Chart Animations/Transitions** — Chart.js basic rendering is sufficient. No custom animations.
- **Responsive Mobile Layout** — Desktop-first. Mobile optimization is future work.

---

## Key Risks

### Risk 1: Performance Degradation with Many Sessions
**What:** Timesheet query might slow down if user has 100+ sessions in a week (unlikely but possible).  
**Phases affected:** Phase 1 (backend query), Phase 2 (frontend rendering).  
**How to catch early:** During Phase 1 testing, load test with synthetic data (100 sessions/week). If query exceeds 500ms, add pagination or caching.

### Risk 2: Chart.js Bundle Size Impact
**What:** Adding `chart.js` increases client bundle size (~60KB).  
**Phases affected:** Phase 3 (velocity chart).  
**How to catch early:** Check bundle size after installing dependency. If >100KB total impact, consider lazy-loading chart component.

### Risk 3: Time Efficiency Metric Might Be Misleading
**What:** `estimatedHours / sessionHours` can be >100% (over-estimated tasks) or <100% (under-estimated). Users might misinterpret as "efficiency" (good/bad) instead of "accuracy."  
**Phases affected:** Phase 3 (metrics).  
**How to catch early:** Include a tooltip explaining "Are our estimates realistic?" — values close to 100% are good, not high values.

### Risk 4: Personal Velocity Shows 0 for Inactive Users
**What:** Engineer on PTO for entire sprint sees "—" in personal velocity table.  
**Phases affected:** Phase 4 (personal velocity).  
**How to catch early:** Ensure "—" is styled distinctively (gray text, muted) and excluded from averages.

### Risk 5: Week Boundary Edge Cases (Sessions Crossing Midnight)
**What:** Session starts at 11 PM and ends at 1 AM next day. Which day does it belong to?  
**Phases affected:** Phase 1 (backend grouping).  
**How to catch early:** Plan specifies: show on start day. Full duration credited to start day. Test explicitly in Phase 1.

---

## Phase 1: Backend — Timesheet Data Layer

**Goal:** Create tRPC router and service for weekly timesheet data, grouped by day.

**File Manifest:**
- **CREATE:** `packages/api/src/modules/timesheet/timesheet.router.ts`
- **CREATE:** `packages/api/src/modules/timesheet/timesheet.service.ts`
- **CREATE:** `packages/api/src/modules/timesheet/timesheet.type.ts`

**Task Breakdown:**

1. **Create `timesheet.type.ts`**
   - Define `SessionRow` type:
     ```typescript
     {
       id: string
       organizationId: string
       startTime: Date
       endTime: Date | null
       tasksCompleted: number
       storyPointsCompleted: number
       frozen: boolean
       note: string | null
     }
     ```
   - Define `DayData` type:
     ```typescript
     {
       date: string // ISO date string (YYYY-MM-DD)
       sessions: SessionRow[]
       totalDuration: number // milliseconds
       totalTasks: number
       totalSP: number
     }
     ```
   - Define `WeekData` type:
     ```typescript
     {
       days: DayData[]
       weekStart: Date
       weekEnd: Date
       weekTotals: {
         totalDuration: number
         totalTasks: number
         totalSP: number
       }
     }
     ```

2. **Create `timesheet.service.ts`**
   - Implement `getWeekData(userId, weekStart, weekEnd, organizationId?)`
   - Query `org_sessions`:
     ```sql
     SELECT * FROM org_sessions
     WHERE user_id = $userId
       AND start_time >= $weekStart
       AND start_time <= $weekEnd
       AND ($orgId IS NULL OR organization_id = $orgId)
     ORDER BY start_time DESC
     ```
   - Group sessions by day (derived from `startTime` date part)
   - Compute duration: `endTime ? (endTime - startTime) : (now - startTime)`
   - Compute day totals: sum duration, tasks, SP
   - Compute week totals: sum all day totals
   - Handle live sessions (`endTime IS NULL`): use current time for duration calculation
   - Return `WeekData` object

3. **Create `timesheet.router.ts`**
   - Define `listByWeek` procedure:
     ```typescript
     input: z.object({
       weekStart: z.string().datetime(),
       weekEnd: z.string().datetime(),
       organizationId: z.string().optional(),
     })
     ```
   - Call `timesheetService.getWeekData(ctx.user.id, weekStart, weekEnd, orgId)`
   - Return `WeekData`

4. **Register router in `packages/api/src/router.ts`**
   - Import `timesheetRouter`
   - Add `timesheet: timesheetRouter` to root router

5. **Test the endpoint**
   - Manual test via tRPC playground or Postman
   - Create test sessions in database (frozen, live, auto-created)
   - Verify grouping, totals, and live session duration calculation

**Dependencies:**
- Existing `org_sessions` table and schema
- Existing `orgSessionService` for session enrichment (not directly used, but context)
- L0-L2 data must exist (sessions created from clock-in/out)

**Verification:**
- Query returns correct day grouping
- Live sessions show elapsed duration
- Organization filter works (org-scoped returns only that org's sessions)
- Week totals match sum of day totals

---

## Phase 2: Frontend — Timesheet Route & Component

**Goal:** Create timesheet pages (unified + org-scoped) with shared `TimesheetTable` component.

**File Manifest:**
- **CREATE:** `packages/web/src/routes/(app)/timesheet/+page.svelte`
- **CREATE:** `packages/web/src/routes/(app)/[orgSlug]/timesheet/+page.svelte`
- **CREATE:** `packages/web/src/lib/components/TimesheetTable.svelte`
- **CREATE:** `packages/web/src/lib/components/EmptyState.svelte` (reusable)

**Task Breakdown:**

1. **Create `EmptyState.svelte`**
   - Props: `illustration` (SVG string), `title`, `message`
   - Render: centered illustration, title (h2), message (p)
   - Styling: muted colors, generous padding

2. **Create `TimesheetTable.svelte`**
   - Props: `weekData` (WeekData type), `organizations` (array, for org name badges)
   - State: none (data comes from parent)
   - Derived: format duration (milliseconds → "Xh Xm"), format time (Date → "h:mm A")
   - Render:
     - Week header: "May 12 – May 18, 2026"
     - Navigation: ← Previous | Next → buttons
     - Table:
       - Columns: Day, Org, Start, End, Duration, Tasks, SP, Badge
       - Rows grouped by day (day header row, then session rows)
       - Badges: "Auto" (gray pill), "Live" (green dot + "Live"), "Locked" (lock icon)
       - Week totals row at bottom
   - Events: `onNavigate(direction: 'prev' | 'next')` → parent updates `weekStart`/`weekEnd`

3. **Create `/timesheet/+page.svelte` (unified)**
   - Load `+page.ts`:
     ```typescript
     import { trpc } from '$lib/trpc'
     import { getOrganization } from '$lib/stores/organization.svelte'
     
     export async function load({ parent }) {
       await parent()
       const orgs = getOrganization().organizations
       const now = new Date()
       const weekStart = getMonday(now)
       const weekEnd = getSunday(now)
       
       const data = await trpc.timesheet.listByWeek.query({
         weekStart: weekStart.toISOString(),
         weekEnd: weekEnd.toISOString(),
         // No organizationId → fetches all orgs
       })
       
       return { weekData: data, organizations: orgs }
     }
     ```
   - State:
     - `weekStart`: Date (current week Monday)
     - `weekEnd`: Date (current week Sunday)
   - Effect: fetch data from tRPC on `weekStart`/`weekEnd` change
   - Render: `<TimesheetTable {weekData} {organizations} onNavigate={handleNavigate} />`
   - Handle week navigation:
     ```typescript
     function handleNavigate(direction) {
       const days = direction === 'prev' ? -7 : 7
       weekStart = addDays(weekStart, days)
       weekEnd = addDays(weekEnd, days)
       // Refetch triggered by effect
     }
     ```
   - Empty state: if `weekData.days.length === 0`, show `<EmptyState>` with calendar illustration

4. **Create `/:orgSlug/timesheet/+page.svelte` (org-scoped)**
   - Similar to unified, but pass `organizationId`:
     ```typescript
     const orgId = getOrganization().activeOrganization?.id
     const data = await trpc.timesheet.listByWeek.query({
       weekStart,
       weekEnd,
       organizationId: orgId,
     })
     ```
   - Same component, different data source

5. **Add helper functions for week boundaries**
   - Create `/src/lib/utils/date-helpers.ts`:
     ```typescript
     export function getMonday(date: Date): Date
     export function getSunday(date: Date): Date
     export function addDays(date: Date, days: number): Date
     export function formatDuration(ms: number): string // "Xh Xm"
     export function formatTime(date: Date): string // "h:mm A"
     export function formatDateShort(date: Date): string // "YYYY-MM-DD"
     ```

6. **Test navigation and rendering**
   - Manual test:
     - Navigate to `/timesheet` and `/:orgSlug/timesheet`
     - Verify sessions render correctly
     - Navigate to previous/next week
     - Verify empty state shows when no sessions
     - Verify live session updates elapsed time (need running timer from L1)

**Dependencies:**
- Backend `timesheet.listByWeek` endpoint (Phase 1 complete)
- L1 org session store (for live session elapsed time)
- Date helper functions (created in this phase)

**Verification:**
- Timesheet renders with real data
- Week navigation updates the view
- Empty state shows for no data
- Live sessions show elapsed time correctly
- Organization badges display org names
- Badges ("Auto", "Live", "Frozen") render correctly

---

## Phase 3: Backend — Velocity Chart & Metrics Data

**Goal:** Extend velocity service to provide sprint velocity data for charts and personal velocity breakdown.

**File Manifest:**
- **EXTEND:** `packages/api/src/modules/velocity/velocity.router.ts`
- **EXTEND:** `packages/api/src/modules/velocity/velocity.service.ts`
- **EXTEND:** `packages/api/src/modules/velocity/velocity.type.ts` (if needed)

**Task Breakdown:**

1. **Add `chart` endpoint to `velocity.router.ts`**
   - Input:
     ```typescript
     {
       organizationId?: string // optional for org-scoped
       projectId?: string // optional for project-scoped
       limit: number // default 8
     }
     ```
   - Logic:
     - Query `sprints` WHERE `status = 'completed'` AND (org/project filter)
     - Order by `endDate DESC` LIMIT `limit`
     - For each sprint:
       - `planned`: `sprint.plannedPoints` (stored on sprint row from L2)
       - `completed`: compute via `velocityService.computeVelocity()`
     - Return:
       ```typescript
       {
         sprints: [{
           id: string
           name: string
           startDate: string
           endDate: string
           planned: number
           completed: number
         }]
       }
       ```

2. **Add `personal` endpoint to `velocity.router.ts`**
   - Input:
     ```typescript
     {
       organizationId?: string
       projectId?: string
       userId?: string // default to current user
     }
     ```
   - Logic:
     - Query completed sprints (same as `chart`)
     - For each sprint:
       - User's tasks: COUNT and SUM(storyPoints) WHERE `assigneeId = userId` AND `status = 'done'` AND `completedAt BETWEEN sprint.startDate AND sprint.endDate`
       - Team's tasks: COUNT and SUM(storyPoints) WHERE `status = 'done'` AND `completedAt BETWEEN sprint.startDate AND sprint.endDate`
       - User share: `(userSP / teamSP) * 100` (or "N/A" if teamSP = 0)
     - Return:
       ```typescript
       {
         sprints: [{
           name: string
           userTasks: number
           userSP: number
           teamSP: number
           userShare: number | null // null if no team tasks
         }]
       }
       ```

3. **Add `timeEfficiency` computation to `velocity.service.ts`**
   - Input: `sprintId`
   - Logic:
     - Query `tasks` WHERE `sprintId = sprintId` AND `status = 'done'`
     - SUM(`estimatedHours`) → `totalEstimated`
     - Query `org_sessions` WHERE `startTime >= sprint.startDate` AND `endTime <= sprint.endDate` (or `endTime IS NULL` → use now)
     - SUM duration → `totalSessionHours`
     - Compute `efficiency = totalEstimated / totalSessionHours`
     - Return: `efficiency` (percentage, can be >100 or <100)
   - Add to `chart` endpoint response:
     ```typescript
     {
       sprints: [...],
       timeEfficiencies: [{
         sprintId: string
         efficiency: number
       }]
     }
     ```

4. **Test endpoints via tRPC playground**
   - Create test data:
     - Multiple completed sprints with tasks
     - Sessions overlapping sprint dates
   - Verify chart data includes planned/completed for each sprint
   - Verify personal velocity breakdown sums correctly
   - Verify time efficiency calculation

**Dependencies:**
- Existing `velocityService.computeVelocity()` (from L2)
- Existing `sprints`, `tasks`, `org_sessions` tables
- L2 sprint completion sets `plannedPoints` on sprint row

**Verification:**
- `velocity.chart` returns array of sprints with planned/completed values
- `velocity.personal` returns per-sprint breakdown for user
- Time efficiency computed correctly
- Handles edge cases (0 tasks, 0 sessions, 0 planned)

---

## Phase 4: Frontend — Velocity Chart & Metrics

**Goal:** Redesign velocity page with Chart.js bar chart, accuracy metrics, and personal velocity section.

**File Manifest:**
- **REWRITE:** `packages/web/src/routes/(app)/[orgSlug]/velocity/+page.svelte`
- **CREATE:** `packages/web/src/lib/components/VelocityChart.svelte`
- **CREATE:** `packages/web/src/lib/components/AccuracyMetrics.svelte`
- **CREATE:** `packages/web/src/lib/components/PersonalVelocity.svelte`

**Task Breakdown:**

1. **Install Chart.js dependencies**
   - Run: `bun add chart.js svelte-chartjs` in `packages/web`
   - Import in `VelocityChart.svelte`

2. **Create `VelocityChart.svelte`**
   - Props: `chartData` (array from `velocity.chart`), `onSprintClick` (callback)
   - Use `svelte-chartjs` Bar component:
     ```svelte
     <Bar
       data={{
         labels: chartData.map(s => s.name),
         datasets: [
           {
             label: 'Planned',
             data: chartData.map(s => s.planned),
             backgroundColor: 'transparent',
             borderColor: 'var(--text-muted)',
             borderWidth: 1,
           },
           {
             label: 'Completed',
             data: chartData.map(s => s.completed),
             backgroundColor: 'var(--brand-primary)',
           },
         ]
       }}
       options={{
         onClick: (event, elements) => {
           if (elements[0]) {
             const index = elements[0].index
             onSprintClick(chartData[index].id)
           }
         }
       }}
     />
     ```
   - Handle empty state: if `chartData.length === 0`, render `<EmptyState>` with bar chart illustration

3. **Create `AccuracyMetrics.svelte`**
   - Props: `sprintData` (from `velocity.chart`), `timeEfficiencies` (from backend)
   - Computed:
     - Throughput accuracy per sprint: `completed / planned * 100`
     - Average throughput: mean of all throughput values
     - Time efficiency per sprint (from backend)
   - Render:
     - Three cards in a row:
       1. **Throughput Accuracy** — average percentage, color-coded badge
       2. **Time Efficiency** — average percentage, color-coded badge, tooltip "Were estimates realistic?"
       3. **Accuracy Trend** — inline list: "85% → 92% → 78% → 95%"
   - Color coding logic:
     ```typescript
     function getColor(value: number) {
       if (value >= 90) return 'green'
       if (value >= 70) return 'yellow'
       return 'red'
     }
     ```

4. **Create `PersonalVelocity.svelte`**
   - Props: `personalData` (from `velocity.personal`), `expanded` (boolean, default true)
   - State: `isExpanded` (derived from prop)
   - Render:
     - Collapsible header: `<button onclick={() => isExpanded = !isExpanded}>My Velocity</button>`
     - If expanded:
       - Table:
         - Columns: Sprint Name, Tasks, SP, Team Total, My Share
         - Rows: `personalData.sprints` (show "—" for null values)
       - Footer row: Average share (exclude "—" rows)
   - Styling:
     - Collapsible toggle with chevron icon
     - Table with proper spacing

5. **Rewrite `velocity/+page.svelte`**
   - Load data:
     ```typescript
     const chartData = await trpc.velocity.chart.query({ organizationId: getOrganization().activeOrganization?.id })
     const personalData = await trpc.velocity.personal.query({
       organizationId: getOrganization().activeOrganization?.id,
       userId: getAuth().currentUser.id,
     })
     ```
   - Layout:
     - Page header: "Velocity" + org badge
     - `<VelocityChart {chartData} onSprintClick={navigateToSprint} />`
     - `<AccuracyMetrics {chartData} {timeEfficiencies} />`
     - `<PersonalVelocity {personalData} expanded={true} />`
   - Handle sprint click:
     ```typescript
     function navigateToSprint(sprintId: string) {
       const sprint = chartData.sprints.find(s => s.id === sprintId)
       goto(`/${orgSlug}/project/${sprint.projectId}/sprints?selected=${sprintId}`)
     }
     ```
   - Empty state: if no completed sprints, show `<EmptyState>` with bar chart illustration

6. **Test chart rendering and interactions**
   - Manual test:
     - Navigate to `/:orgSlug/velocity`
     - Verify chart renders with two bars per sprint
     - Hover shows exact values
     - Click on bar navigates to sprint board
     - Verify metrics cards show correct values and colors
     - Expand/collapse personal velocity section
     - Verify personal velocity table renders correctly
     - Verify empty state shows when no completed sprints

**Dependencies:**
- Backend `velocity.chart` and `velocity.personal` endpoints (Phase 3 complete)
- Chart.js and svelte-chartjs installed
- Existing sprint routes for navigation

**Verification:**
- Chart renders with real data
- Hover tooltips show planned/completed values
- Click navigates to correct sprint
- Accuracy metrics display correctly
- Personal velocity section expands/collapses
- Empty state shows for no data

---

## Phase 5: Integration & Edge Case Testing

**Goal:** Ensure L3 features integrate correctly with L0-L2 and handle all edge cases.

**File Manifest:**
- No new files (testing existing L3 components)

**Task Breakdown:**

1. **Test timesheet + org session integration**
   - Clock in to an org → verify session appears in timesheet as "Live"
   - Complete a task → verify enrichment updates on clock-out
   - Clock out → verify session shows completed tasks/SP
   - Navigate through weeks → verify data updates correctly
   - Test live session elapsed time updates (uses L1 timer)

2. **Test velocity + sprint completion integration**
   - Complete a sprint → verify it appears in velocity chart
   - Verify `plannedPoints` is set on sprint completion (L2 behavior)
   - Verify completed SP computed correctly from tasks
   - Click on sprint bar → verify navigation to sprint board

3. **Test personal velocity + task assignment integration**
   - Assign tasks to different users → verify personal velocity shows correct user data
   - Complete sprint → verify user's contribution shows in personal velocity
   - Test user with 0 tasks in sprint → verify "—" displays

4. **Test edge cases**
   - **No sessions in week:** Empty state shows in timesheet
   - **No completed sprints:** Empty state shows in velocity chart
   - **Sprint with 0 planned SP:** Shows "N/A" for throughput
   - **User with 0 tasks in sprint:** Shows "—" in personal velocity
   - **Session crossing midnight:** Shows on start day with full duration
   - **Live session on week boundary:** Shows with elapsed time, "—" for end time

5. **Test org-scoped vs unified timesheet**
   - Switch orgs → verify org-scoped timesheet shows only that org's sessions
   - View unified timesheet → verify all orgs' sessions appear
   - Verify org badges display correctly

6. **Check bundle size impact**
   - Build production bundle
   - Check if Chart.js adds >100KB
   - If too large, consider lazy-loading `VelocityChart.svelte`

7. **Performance test**
   - Load test timesheet with 100 sessions in a week
   - Measure query time (should be <500ms)
   - If slow, add pagination or caching

**Dependencies:**
- All previous phases (1–4) complete
- L0-L2 features fully implemented and tested

**Verification:**
- All integration tests pass
- Edge cases handled gracefully
- Performance acceptable
- Bundle size reasonable

---

## Phase 6: Documentation & Cleanup

**Goal:** Document L3 features and clean up any technical debt.

**File Manifest:**
- **UPDATE:** `CONTEXT.md` (if needed)
- **UPDATE:** `README.md` (add L3 feature descriptions)
- **CREATE:** `docs/features/timesheet.md`
- **CREATE:** `docs/features/velocity.md`

**Task Breakdown:**

1. **Create feature documentation**
   - `docs/features/timesheet.md`:
     - Purpose: org-level time tracking
     - Routes: `/timesheet` (unified), `/:orgSlug/timesheet` (org-scoped)
     - Data source: `org_sessions`
     - Week navigation behavior
     - Live/frozen/auto-created badges
   - `docs/features/velocity.md`:
     - Purpose: team velocity visualization and personal contribution
     - Route: `/:orgSlug/velocity`
     - Chart interaction (click to navigate)
     - Metrics: throughput accuracy, time efficiency, trend
     - Personal velocity breakdown

2. **Update README.md**
   - Add L3 features to feature list:
     - Timesheet: weekly org session tracking
     - Velocity Chart: sprint-by-sprint planned vs completed
     - Estimation Accuracy: throughput, time efficiency, trends
     - Personal Velocity: individual contribution per sprint

3. **Review and clean up code**
   - Remove any debug console.log statements
   - Ensure all TypeScript types are exported properly
   - Verify all imports use `$lib` aliases consistently
   - Run `bun run typecheck` and fix any type errors
   - Run `bun run lint` and fix any lint issues

4. **Final testing**
   - Run full test suite: `bun run test`
   - Manual smoke test of all L3 features
   - Verify build succeeds: `bun run build`

**Dependencies:**
- All previous phases (1–5) complete

**Verification:**
- Documentation is clear and accurate
- No type errors
- No lint errors
- Build succeeds
- All tests pass

---

## Final Checklist

Before marking L3 complete, verify:

- [ ] Timesheet renders with real data (org-scoped and unified)
- [ ] Week navigation works correctly
- [ ] Live sessions show elapsed time
- [ ] Auto/frozen badges display correctly
- [ ] Velocity chart renders with planned/completed bars
- [ ] Click on sprint bar navigates to sprint board
- [ ] Accuracy metrics show correct values and colors
- [ ] Personal velocity section expands/collapses
- [ ] Empty states show for no data
- [ ] All edge cases handled
- [ ] Integration with L0-L2 verified
- [ ] No new database migrations needed
- [ ] Bundle size acceptable
- [ ] Documentation complete
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Build succeeds
- [ ] All tests pass

---

## Success Metrics

After L3 implementation:
- **Timesheet usage:** Engineers use timesheet weekly to track work
- **Velocity visibility:** PMs review velocity chart in retrospectives
- **Estimation improvement:** Teams reference time efficiency to adjust estimates
- **Personal accountability:** Engineers track their contribution over time

---

## Risk Mitigation Summary

| Risk | Mitigation | Phase |
|------|------------|-------|
| Performance with many sessions | Load test in Phase 1, add pagination if >500ms | Phase 1, Phase 5 |
| Chart.js bundle bloat | Check bundle size in Phase 4, lazy-load if >100KB | Phase 4, Phase 5 |
| Time efficiency misinterpretation | Include tooltip explaining "accuracy" not "efficiency" | Phase 3, Phase 4 |
| Week boundary edge cases | Explicit test for midnight-crossing sessions | Phase 1, Phase 5 |
| Zero data edge cases | Comprehensive empty states with helpful messages | Phase 2, Phase 4 |

---

**End of Implementation Plan**