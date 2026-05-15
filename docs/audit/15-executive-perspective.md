# Company Owner/Executive Perspective Audit

**Audit Date:** May 15, 2026  
**Persona:** Alexandra Chen - Organization Owner/Executive  
**Focus:** Organization health, aggregated metrics, exception management, board reporting

---

## Persona Profile

### Alexandra Chen - Company Owner/Executive

**Role:** Organization Owner / Executive Leader  
**Organization:** Mid-sized technology company (80-150 employees)  
**Time Available:** 5-15 minutes per day for PM tool interaction

**Background:**
- May be founder, CEO, or C-level executive
- Responsible for: strategic direction, resource allocation, stakeholder communication
- Delegates detailed PM work to Project Managers
- Reviews data weekly/monthly for decision-making

**Goals:**
1. Visibility into all projects without micromanaging
2. Ensure deliverables are on track
3. Make resource allocation decisions
4. Identify risks before they become crises
5. Demonstrate ROI to stakeholders

**Time Constraints:**
- Limited time: 5-15 min/day typical interaction
- Fragmented attention: frequent interruptions
- Batch processing: reviews accumulated data weekly/monthly
- Decision events: rapid review when issues surface

**Decision Making:**
- Weekly: Skim team velocity, check for blockers
- Monthly: Deep dive into metrics, forecast analysis
- Quarterly: Strategic planning, performance reviews
- Event-driven: Rapid assessment when issues arise

---

## Critical User Stories

### Dashboard & Reporting Stories

1. **See organization health at a glance** - Assess everything in 30 seconds
2. **View velocity aggregated across teams** - Understand organizational throughput
3. **See overdue tasks across all projects** - Identify critical items immediately
4. **Drill into projects from dashboard** - Investigate issues without asking PM
5. **Export dashboards to PDF/Excel** - Include in board presentations

### Team Performance Stories

1. **View velocity per team member** - Assess individual contribution
2. **Compare individual to team average** - Calibration for reviews
3. **See capacity utilization breakdown** - Identify burn-out risks
4. **View historical performance trends** - Performance over time
5. **Export employee metrics** - Prepare for performance discussions

### Strategic Planning Stories

1. **See backlog size vs. velocity** - Forecast completion dates
2. **Compare planned vs. actual velocity** - Understand planning accuracy
3. **View resource allocation** - Who is working on what
4. **Set target velocity goals** - Define improvement targets

### Resource Management Stories

1. **See all team members across workspaces** - Understand organization structure
2. **View capacity allocation percentages** - Identify overload
3. **See upcoming availability changes** - Plan for PTO
4. **Identify cross-project conflicts** - Same person on overlapping sprints

---

## User Journey Analysis

### Daily Workflow (5-15 minutes)

**Morning Check (Weekdays, 5 min):**
| Time | Action | Need |
|------|--------|------|
| 7:00 AM | Open Saha on tablet | Quick, mobile-accessible dashboard |
| 7:01 AM | Scan "All Projects" health indicators | Visibility into status |
| 7:02 AM | Check "Overdue Tasks" count | Identify critical issues |
| 7:04 AM | Review notifications | Exception-based awareness |
| 7:05 AM | Close app, continue day | Time-efficient interaction |

**Afternoon Delegation (as needed, 5 min):**
| Time | Action | Need |
|------|--------|------|
| Between meetings | Open "Team Members" view | Resource visibility |
| 2 mins | Identify overloaded team member | Capacity management |
| 1 min | Send Slack to PM | Action without micromanagement |
| 2 mins | Note issue for weekly review | Follow-up discipline |

### Weekly Review (30-60 minutes)

**Friday Weekly Review:**
| Step | Duration | Action | Questions Answered |
|------|----------|--------|-------------------|
| 1 | 10 min | Review org-wide velocity trend | Is throughput improving? |
| 2 | 10 min | Drill into "at-risk" projects | What's blocking? |
| 3 | 10 min | Review capacity utilization | Who needs help? |
| 4 | 5 min | Check upcoming deadlines | What's due next week? |
| 5 | 10 min | Review team member trends | Performance concerns or wins? |
| 6 | 5 min | Note action items | What follow-up is needed? |

---

## Audit Results

### Executive Dashboard
**Score: 2/10 - MISSING**

| Requirement | Status | Notes |
|------------|--------|-------|
| Organization-level view | ❌ Missing | No dedicated executive page |
| Health indicators | ❌ Missing | No on-track/at-risk status |
| All projects at a glance | ⚠️ Partial | Projects list but no metrics |
| Scannable in 30 seconds | ❌ Fails | Must click through each project |

**What Exists:**
- Home page: Personal task Kanban (not executive-level)
- Projects page: Flat list by workspace
- Velocity page: Requires manual sprint selection

**What's Needed:**
- Single dashboard showing all project statuses
- Health indicators (green/yellow/red)
- Active sprint summary
- Overdue items count (clickable)
- Capacity utilization overview

### Aggregated Metrics
**Score: 3/10 - PARTIAL**

| Requirement | Status | Notes |
|------------|--------|-------|
| Velocity aggregated | ⚠️ Partial | Can filter by workspace |
| Trends visible | ❌ Missing | No charts or history |
| Capacity org-wide | ❌ Missing | Only per-sprint capacity |
| Backlog projection | ⚠️ Partial | Per-project only |

**What Exists:**
- Velocity page with filters
- Per-project forecast view
- Custom date range selection

**What's Needed:**
- Organization total velocity trend
- Historical performance charts
- Team-level capacity summary
- Burndown/burnup visualizations

### Exception Management
**Score: 2/10 - MINIMAL**

| Requirement | Status | Notes |
|------------|--------|-------|
| Overdue tasks surfaced | ⚠️ Partial | Badge exists but no detail view |
| Blocked items visible | ❌ Missing | No blocked status |
| Capacity warnings | ⚠️ Partial | Only per-sprint capacity table |
| "What's wrong" view | ❌ Missing | No exception dashboard |

**What Exists:**
- Overdue count badge in topbar
- Per-project capacity table

**What's Needed:**
- Dedicated exception view
- Blocked task visibility
- Proactive alerts for issues
- Risk indicators on projects

### Drill-Down Capability
**Score: 6/10 - PARTIAL**

| Requirement | Status | Notes |
|------------|--------|-------|
| Drill into projects | ✅ Works | Can navigate from list |
| Drill into members | ⚠️ Partial | Link exists but limited data |
| Intuitive navigation | ⚠️ Partial | Some confusing patterns |

**Issues:**
- Back button on member page goes to wrong place
- No breadcrumb navigation
- Sprint tabs use client state (not URL-addressable)

### Reporting & Export
**Score: 0/10 - MISSING**

| Requirement | Status | Notes |
|------------|--------|-------|
| Dashboard export | ❌ Missing | No functionality |
| PDF export | ❌ Missing | Not implemented |
| Excel/CSV export | ❌ Missing | Not implemented |
| Board-ready reports | ❌ Missing | No report generation |

**What Exists:**
- Nothing - zero export functionality

**What's Needed:**
- Export velocity data
- Export capacity reports
- Generate PDF summaries
- Create board presentations

---

## Critical Issues Affecting Executives

### Priority: Critical

1. **No Organization Dashboard**
   - No single view of organizational health
   - Must click through each project manually
   - **Impact:** Cannot perform 30-second health check

2. **No Project Health Indicators**
   - Projects don't show on-track/at-risk status
   - No way to identify problems quickly
   - **Impact:** Issues discovered too late

3. **No Exception Dashboard**
   - Overdue tasks visible only as count
   - Cannot see the actual tasks
   - **Impact:** Must ask PMs for status

4. **No Export Capability**
   - Cannot prepare board presentations
   - Cannot share metrics with stakeholders
   - **Impact:** Manual work to create reports

### Priority: High

5. **No Velocity Charts**
   - Velocity exists as numbers only
   - No trend visualization
   - **Impact:** Cannot see performance trajectories

6. **No Team-Level Capacity Summary**
   - Capacity only visible per-sprint
   - No org-wide capacity view
   - **Impact:** Cannot identify overloaded teams

7. **No Historical Performance Data**
   - Member profile shows 90-day aggregate
   - No sprint-by-sprint breakdown
   - **Impact:** Cannot calibrate performance

---

## Feature Gap Matrix

| Feature | Executive Needs | Priority | Status |
|---------|-----------------|----------|--------|
| Organization dashboard | Must-have | P0 | Missing |
| Project health indicators | Must-have | P0 | Missing |
| Exception view | Must-have | P0 | Missing |
| Export functionality | Must-have | P0 | Missing |
| Velocity trend charts | Should-have | P1 | Missing |
| Org-level capacity view | Should-have | P1 | Missing |
| Member performance trends | Should-have | P1 | Partial |
| Backlog projection | Should-have | P1 | Partial |

---

## User Story Coverage

| Category | Defined | Covered | Coverage |
|----------|---------|---------|----------|
| Dashboard | 8 | 1 | 13% |
| Team performance | 8 | 3 | 38% |
| Strategic planning | 8 | 1 | 13% |
| Resource management | 8 | 1 | 13% |
| Governance | 5 | 1 | 20% |
| **Total** | **37** | **7** | **19%** |

---

## Scannability Assessment

### Can an executive scan the app in 30 seconds?

**Current State: FAILS**

What executive would need to do:
1. Navigate to Home → See personal tasks (not org view)
2. Navigate to Projects → See flat list (no health indicators)
3. Navigate to Velocity → Select sprint manually (no overview)
4. Click into each project to check status

**What they need:**
- One dashboard showing:
  - Organization health status (color-coded)
  - Active sprints count
  - Overdue tasks count (clickable)
  - Team capacity utilization
  - Velocity trend arrow

**Time to get org health: CURRENTLY 15+ MINUTES**

---

## Recommendations

### Immediate (P0)

1. **Create Executive Dashboard**
   - Route: `/executive` or redesign `/home`
   - Show: Health status, active sprints, overdue, capacity
   - 30-second scan target

2. **Add Project Health Field**
   - Status: on-track / at-risk / blocked
   - Visual indicators on projects list
   - Configurable health rules

3. **Create Exception View**
   - Route: `/exceptions` or section in dashboard
   - Show: All overdue, blocked, high-priority items
   - Filtered view of problems

4. **Implement Export**
   - CSV/PDF buttons on velocity, capacity pages
   - Board presentation format

### Short-Term (P1)

5. **Add Velocity Charts**
   - Line chart: last N sprints
   - Organization-level aggregation
   - Trend indicator (up/down/flat)

6. **Create Team Capacity Summary**
   - Aggregated capacity at organization level
   - Overload warnings (red for >100%)
   - Historic comparison

7. **Enhance Member Pages**
   - Sprint-by-sprint velocity history
   - Trend visualization
   - Export for performance discussions

8. **Add Blocked Status**
   - Implement "blocked" status
   - Visual indicator in task cards
   - Include in exception dashboard

### Medium-Term (P2)

9. **Scheduled Reports**
   - Weekly email summary
   - Customizable metrics
   - Board packet generation

10. **Historical Metrics**
    - Year-over-year comparison
    - Trend analysis
    - Performance benchmarks

---

## Conclusion

**Overall Score: 2/10 - SIGNIFICANT GAPS**

The PM-manager application is built for project managers and team members, not organizational leaders. Critical executive features are missing:

**Most Critical Issues:**

1. **No executive dashboard** - The single most important gap
2. **No health indicators on projects** - Can't identify at-risk work
3. **No exception management view** - No "what's wrong" page
4. **No export capability** - Can't create board presentations
5. **No velocity trends visualization** - Can't see trajectories

**Estimated Impact:**
Without these changes, executive users would spend **15+ minutes clicking through projects** to understand organizational health, missing the 5-minute daily check that the persona requires.

**Current Experience:**
- Cannot see org health in 30 seconds
- Cannot identify problems without PM intervention
- Cannot prepare board reports
- Cannot make data-driven resource decisions

**Recommended Focus:**
1. Create organization dashboard (single most valuable addition)
2. Add project health indicators
3. Build exception view for problems
4. Implement basic export functionality

These four features would raise the executive experience from "2/10 unusable" to "6/10 functional for basic needs."