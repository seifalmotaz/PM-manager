# Saha — Level 3: Visibility & Intelligence

**Version:** 2.0
**Date:** May 15, 2026
**Status:** Approved
**Type:** Product Requirements & Specification

---

## Objective

Transform the task completion data and org session data into meaningful, actionable views. The timesheet shows an engineer their work across time. Velocity charts show PMs sprint-by-sprint performance. Sprint estimation accuracy provides the feedback loop for better planning. Personal velocity gives engineers insight into their own contribution.

---

## Decision Log (Grilled Questions & Answers)

### Decision 1: Timesheet view — what organizing principle?

**Question:** The timesheet shows org session data. How should it be organized — calendar week, per-org breakdown, or chronological log?

**Resolution (Option C from grilling):** Unified chronological table across all orgs with org badges. Pure chronological log.

**Why:** This is the simplest, most intuitive view. The engineer sees "what did I do, when, for which org, and what got done?" in a single scrolling list. No collapsed sections, no tab switching. Org badges provide visual discrimination.

**Data sources:** All rendered from `org_sessions` — no additional table needed. Auto-enrichment from L2 populates everything at clock-out time.

**Key metrics per row:**
- Day (derived from `startTime`)
- Org name + color badge
- Start time, end time
- Duration (computed: endTime - startTime, or elapsed for live sessions)
- Tasks completed (from enrichment)
- Story points completed (from enrichment)

**Week totals row:** At bottom: total duration, total tasks, total SP for the visible week.

**Week navigation:** ← Previous Week / Next Week → buttons. Current week is default.

**Visual indicators:**
- Auto-created sessions: marked with "Auto" badge (system-generated, not user-confirmed)
- Frozen sessions: marked as "Locked" with a lock icon (sprint completed)
- Live sessions: show elapsed time, endTime column shows "—"

---

### Decision 2: Velocity charts — what's the first chart?

**Question:** The audit found "zero charts or visualizations." What's the first chart we build?

**Resolution (Option A from grilling):** Sprint velocity bar chart. One bar per sprint showing planned vs completed story points.

**Chart structure:** Grouped bar chart. X-axis = sprint names (chronological). Two bars per sprint: planned SP (outline) and completed SP (fill). Y-axis = story points.

**Data source:** Sprint completion snapshots (computed at sprint end in L2, stored on the sprint row). No real-time computation — these are frozen numbers after sprint completion.

**Number of sprints shown:** Last 8 sprints (configurable, default 8). Enough to show trends without overwhelming.

**Interaction:**
- Hover on bar: tooltip "Planned: 35 SP / Completed: 28 SP"
- Click on sprint bar: navigates to that sprint's detail/board
- Future: overlay average velocity trend line

**Chart rendering approach:** To be decided during implementation. Options are lightweight custom SVG or Chart.js. The spec does not prescribe the implementation technology — only the behavior and data contract.

---

### Decision 3: Sprint estimation accuracy — which metrics?

**Question:** The velocity page shows charts. What accuracy metrics complement the chart?

**Resolution (All three from grilling):** Displayed on the velocity page below the chart.

**Metric 1 — Throughput Accuracy:**
- Formula: `actual SP completed / planned SP`
- Shows: "Did we ship what we committed to?"
- Display: percentage. "Sprint 4: 28/35 SP = 80%"
- Color coding: green above 90%, yellow 70-90%, red below 70%

**Metric 2 — Time Efficiency:**
- Formula: `total estimatedHours of completed tasks / total org session hours for that sprint`
- Shows: "Were our estimates realistic?"
- Display: percentage. Over 100% = estimates were too high. Under 100% = tasks took longer than expected.
- Interpretation note: This is NOT "are we efficient." It's "are we accurate." Both underestimation and overestimation are bad.

**Metric 3 — Per-Sprint Accuracy Trend:**
- Shows: Throughput accuracy for each sprint in a simple list/table
- Purpose: "Are we getting better at estimating?"
- Display: "Sprint 1: 85% → Sprint 2: 92% → Sprint 3: 78% → Sprint 4: 95%"
- Aggregate: Average, best sprint, worst sprint

**Location:** All three metrics visible on the velocity page below the bar chart. Not on a separate page.

---

### Decision 4: Personal velocity — what does the engineer see?

**Question:** The velocity page shows team-level metrics. What does the engineer see about their own contribution?

**Resolution (Option A from grilling):** Per-sprint breakdown table on the velocity page.

**Table columns:**
- Sprint name
- Tasks completed (by this engineer in this sprint)
- SP completed (by this engineer)
- Team total SP (all engineers in this sprint)
- My Share (engineer's SP / team SP × 100%)

**Data query:** Tasks filtered by `assigneeId = current user` AND `status = 'done'` AND `sprintId = [sprint]`. Sprint must be completed or active.

**Team total:** Count of all completed SP in the sprint regardless of assignee. Gives the engineer context: "I did 14 SP out of 32 total = 44%."

**Display position:** Collapsible section or tab on the velocity page. Default: collapsed. Engineer expands to see their data.

---

### Decision 5: Auto-enrichment recomputation — when does it fire?

**Question:** From L2, we decided auto-enrichment fires on clock-out. But what if a task is completed AFTER clock-out (retroactive)?

**Resolution (Option A from grilling):** Recompute the session.

**Trigger:** Task status changes to "done" with `completedAt` that falls within a closed session's time window.

**Behavior:**
1. Find the org_session that covers the task's completion time.
2. If session exists AND `frozen = false`: recompute enrichment fields. `updatedAt` set to current time.
3. If session exists AND `frozen = true`: REJECT. "This session is frozen (sprint completed). Cannot update."
4. If no session covers it: auto-create minimal session.

**Why this matters:** Without recomputation, an engineer who finishes work at 5 PM but forgets to mark tasks Done until 5:30 PM would have 0 tasks recorded for that day. Recomputation closes the gap.

**Sprint metrics impact:** If the recomputed session falls within an active sprint window, sprint metrics update live. If sprint is completed, the session is frozen and recomputation is rejected.

---

## User Stories (L3 Scope)

### Timesheet Stories

| ID | Story | Acceptance |
|----|-------|------------|
| TS-01 | As an engineer, I want a weekly timesheet showing all my org sessions so I know what I worked on and for how long. | Timesheet renders chronological list. Week totals displayed. |
| TS-02 | As an engineer, I want to navigate between weeks so I can review past work or plan ahead. | Previous/Next week buttons. Current week default. |
| TS-03 | As an engineer, I want to distinguish auto-created sessions from manually clocked sessions so I know which data I confirmed. | Auto badge on system-generated sessions. |
| TS-04 | As an engineer, I want to see live sessions in the timesheet so I know my current tracking state. | Live sessions show elapsed time, endTime = "—". |

### Velocity & Accuracy Stories

| ID | Story | Acceptance |
|----|-------|------------|
| VA-01 | As a PM, I want a velocity bar chart comparing planned vs completed per sprint so I can spot trends visually. | Bar chart renders. Hover shows tooltip. 8 sprints shown. |
| VA-02 | As a PM, I want throughput accuracy metrics so I know if we're hitting sprint commitments. | Percentage displayed. Color-coded thresholds. |
| VA-03 | As a PM, I want time efficiency metrics so I know if our estimates are realistic. | Ratio of estimated hours to session hours displayed. |
| VA-04 | As a PM, I want accuracy trends sprint-over-sprint so I can see if we're improving. | Per-sprint list with trend indicator. |
| VA-05 | As an engineer, I want to see my personal velocity per sprint so I can track my own contribution. | Per-sprint table with tasks, SP, team total, my share. |
| VA-06 | As an engineer, I want to compare my velocity to team average so I have context for my contribution. | Team total column in personal velocity table. |

---

## User Journey: PM Reviews Sprint Data

**Friday Afternoon (Post-Sprint Retrospective):**
1. PM opens `/:acme-corp/velocity`.
2. Sees bar chart: Sprint 1 through Sprint 6. Sprint 5 bar is taller (42 SP completed vs 35 planned). Sprint 3 bar is shorter (18 SP vs 30 planned).
3. Hovers on Sprint 3 bar. Tooltip: "Planned: 30 SP / Completed: 18 SP = 60%."
4. Scrolls down to estimation accuracy:
   - Throughput: Sprint 3 = 60%. Sprint 5 = 120%. Average = 85%.
   - Time efficiency: Sprint 3 = 72% (estimates too low — tasks took longer). Sprint 5 = 110% (estimates too high).
   - Trend: "Average accuracy improving: 75% → 82% → 85% over last 4 sprints."
5. Clicks "My Velocity" tab. Sees personal contribution:
   - Sprint 6: 14 SP (5 tasks). Team total: 24 SP. Share: 58%.
   - Sprint 5: 18 SP. Team total: 42 SP. Share: 43%.
   - "I carried more weight in Sprint 6. Team was spread thinner."

---

## User Journey: Engineer Reviews Their Week

**Friday Evening:**
1. Engineer opens `/:acme-corp/timesheet` (or unified timesheet from `/timesheet` — route TBD).
2. Sees this week's data:

```
Mon  Acme Corp   9:15 AM – 5:30 PM   8h 15m   5 tasks   13 SP
Mon  FreelanceCo 5:45 PM – 7:00 PM   1h 15m   1 task    3 SP  [Auto]
Tue  Acme Corp   9:30 AM – 5:15 PM   7h 45m   4 tasks   11 SP
Wed  Acme Corp   9:00 AM – (live)    6h 30m*  3 tasks   8 SP*
```

3. Notices the FreelanceCo session is marked "Auto" — remembers they forgot to clock in for freelance work but the system auto-captured it.
4. Sees week totals: "22h 45m, 13 tasks, 35 SP."
5. Satisfied that all time was captured without any manual timer discipline.

---

## Features Delivered

### Timesheet View
- Chronological list of org sessions.
- Org badges for visual discrimination.
- Week navigation (previous/next).
- Week totals row.
- Auto-created session indicator.
- Frozen session indicator.
- Live session handling (shows elapsed).

### Velocity Bar Chart
- Grouped bars: planned vs completed per sprint.
- Last 8 sprints visible.
- Hover tooltip with exact numbers.
- Click to navigate to sprint.

### Estimation Accuracy
- Throughput accuracy (completed SP / planned SP).
- Time efficiency (estimated hours / session hours).
- Per-sprint accuracy trend.
- Color-coded thresholds.

### Personal Velocity
- Per-sprint breakdown table.
- Tasks, SP, team total, share percentage.
- Collapsible section on velocity page.

---

## Routes Created/Affected

| Route | Changes |
|-------|---------|
| `/:orgSlug/velocity` | Velocity page redesigned: chart + accuracy metrics + personal velocity |
| `/:orgSlug/timesheet` | New route: timesheet view for this org |
| `/timesheet` | New route: unified timesheet across all orgs |

---

## Data Requirements

### What L3 Reads From:
- `org_sessions` (for timesheet and capacity computations)
- `sprints` (for sprint velocity data)
- `tasks` (for personal velocity queries)
- `organization_settings` (for timezone normalization)

### What L3 Does NOT Introduce:
- No new database tables
- No new migrations
- No changes to existing tables
- All data is read-only from existing sources

### Computation Model:
- Velocity and accuracy metrics are computed on read
- Timesheet is computed on read from org_sessions
- No stored aggregates or materialized views in L3
- If performance degrades, caching can be added in a future optimization pass

---

## Integration Points with Other Levels

### From L2:
- Sprint completion snapshots (source of planned/completed SP for charts)
- Auto-enriched org_sessions (source of timesheet data)
- Frozen sessions (distinguished in timesheet display)

### From L1:
- Active org context (scopes velocity and timesheet views)
- Clock-in/out state (live sessions visible in timesheet)

### Into L4:
- Charts and timesheets will use the toast notification system for errors
- Timesheet export deferred to L4 decision

### Into L5:
- Organization dashboard will link to velocity page
- Employee directory will link to personal velocity from member detail page

---

## Edge Cases Catalog

| Edge Case | Resolution |
|-----------|------------|
| No sprints completed yet (new org) | Velocity chart shows empty state: "Complete your first sprint to see velocity data." |
| Single sprint completed | Chart shows one bar. Trend data shows "Needs more data (1 sprint)." |
| Sprint with 0 planned SP | Planned bar = 0. Completed bar may be >0 (if tasks were added mid-sprint). OverVelocity = undefined (division by zero). Display "N/A." |
| Timesheet with no sessions | Empty state: "No sessions recorded this week. Start working to track your time." |
| Timesheet spanning midnight | Session appears on the day it started. If duration crosses midnight, the full duration is credited to the start day. |
| Engineer has 0 tasks in a sprint (was on PTO) | Personal velocity shows "—" for that sprint. Not included in average. |
| Auto-enrichment returns 0 for all fields | Display "0" — no special handling. PM investigates via flagged tasks list. |
| User switches org while viewing timesheet | Timesheet view updates to show selected org's data (if on org-scoped view). Unified timesheet at `/timesheet` unaffected. |
| Very long sprint names truncate chart labels | Truncated with ellipsis. Full name in tooltip. |
