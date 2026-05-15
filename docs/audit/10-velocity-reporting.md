# Velocity & Reporting Features Audit Report

**Audit Date:** May 15, 2026  
**Audited Module:** Velocity, Reports, Analytics  
**Severity Distribution:** 2 Critical, 4 High, 4 Medium, 3 Low

---

## Executive Summary

The PM-manager application has a **partially implemented velocity and reporting system**. The **core velocity calculation engine is functional and well-tested**, but several **critical features from the specification are incomplete or missing entirely**.

---

## 1. Velocity Calculation Engine

### Current State

**COMPLETED** - Fully implemented and tested.

**Files:**
- `/packages/api/src/modules/velocity/velocity.service.ts` - Core velocity calculation logic
- `/packages/api/src/modules/velocity/velocity.router.ts` - Three view modes (live, snapshot, custom)
- `/packages/api/src/modules/velocity/velocity.spec.ts` - Comprehensive test suite

**What Exists:**
- `computeVelocity()` calculates completed story points from tasks within a date range
- Three modes: Live (sprint start → now), Snapshot (completed sprints only), Custom (any dates)
- Filters: workspaceIds, projectIds, sprintId, userId
- plannedPoints calculation for sprint context (excludes flagged tasks)
- overVelocity ratio (completedPoints / plannedPoints)
- flaggedTasks detection (tasks with sprintFlag !== null)
- taskCount metric

### Issues Found

**None Critical** - The calculation logic is correct.

**Minor Issues:**
1. **[Low]** No caching - velocity is recomputed on every query
2. **[Low]** No pagination on flaggedTasks - could be large if many flagged tasks exist

### Calculation Issues

**None** - Math is correct:
- `completedPoints = sum(storyPoints || 0)` - handles null storyPoints correctly
- `plannedPoints` excludes flagged tasks (correct)
- `overVelocity` returns undefined when plannedPoints is 0 (correct - avoids division by zero)

---

## 2. Velocity View (Global Page)

### Current State

**COMPLETED** - Basic implementation exists.

**Files:**
- `/packages/web/src/routes/(app)/velocity/+page.svelte` - Global velocity page
- `/packages/web/src/lib/components/VelocityView.svelte` - Reusable display component
- `/packages/web/src/lib/components/VelocityModeSelector.svelte` - Mode switcher

**What Exists:**
- Three view modes: Live, Snapshot, Custom
- Sprint selector for live/snapshot modes
- Date range picker for custom mode
- Workspace/project multi-select filters for custom mode
- Basic metrics display (completedPoints, plannedPoints, ratio, taskCount)
- Flagged tasks section

### Issues Found

| Severity | Issue | File |
|----------|-------|------|
| **High** | No workspace-scoped velocity page | N/A |
| **Medium** | No visual charts/graphs | VelocityView.svelte |

**Details:**

1. **[High] Missing Workspace Velocity Page:**
   - Spec calls for `/workspace/[id]/velocity` page (cross-project aggregation)
   - Only global `/velocity` exists
   - Directory doesn't exist

2. **[Medium] No Charts/Graphs:**
   - Velocity metrics shown as plain numbers
   - No velocity trend line chart
   - No historical velocity comparison
   - No burndown/up chart
   - Only basic progress bar in ForecastView (not velocity)

3. **[Low] Auto-fetch race condition:**
   - Custom mode auto-fetches when both dates are set
   - Could lead to multiple API calls if user types quickly

---

## 3. Charts/Graphs (Visual Reports)

### Current State

**MISSING** - No chart library or visual reports exist.

**No chart/visualization files found.**
- `package.json` has no chart libraries (no d3, recharts, chart.js, etc.)

### Issues Found

| Severity | Issue | Description |
|----------|-------|-------------|
| **Critical** | No velocity history chart | Can't see velocity trend over multiple sprints |
| **Critical** | No burndown/burnup chart | Can't see sprint progress visualization |
| **High** | No bar charts for sprint velocity | Can't compare sprint-to-sprint velocity |
| **High** | No team performance graphs | No visual representation of team metrics |

### Missing Elements

- Velocity trend chart (sprint-over-sprint velocity)
- Burndown chart (sprint progress)
- Burnup chart (cumulative completed vs total)
- Sprint comparison chart
- Team member contribution visualization

---

## 4. Team Performance Tracking

### Current State

**PARTIALLY IMPLEMENTED**

**Files:**
- `/packages/web/src/routes/(app)/workspace/[wid]/member/[uid]/+page.svelte` - Employee page
- `/packages/web/src/routes/(app)/workspace/[wid]/member/[uid]/+page.ts` - Data loader

**What Exists:**
- Employee velocity for last 90 days (single metric)
- Task count (completed/active)
- List of assigned tasks
- Current workload metrics

### Issues Found

| Severity | Issue | File | Details |
|----------|-------|------|---------|
| **Medium** | No velocity history per sprint | +page.ts | Only aggregates to 90-day total |
| **Medium** | No velocity trend | +page.svelte | No per-sprint breakdown |
| **Low** | Hardcoded 90 days | +page.ts line 18 | Not configurable |

**Missing Elements per Spec:**
- Per-sprint velocity history (last 4 sprints)
- Visual bar chart for velocity history
- Sprint-by-sprint breakdown
- Capacity hours comparison

---

## 5. Task Completion Metrics

### Current State

**COMPLETED** - Calculations are correct.

**File:** `/packages/api/src/modules/velocity/velocity.service.ts` lines 58-100

**What Exists:**
- Task count from completed tasks in date range
- Story points aggregation
- Correct handling of null storyPoints (treats as 0)
- Filters by completedAt timestamp (not sprint ownership)

**Issues Found:** **None** - Completion tracking is accurate.

---

## 6. Report Filters

### Current State

**PARTIALLY IMPLEMENTED**

**Files:**
- `/packages/web/src/lib/components/VelocityModeSelector.svelte` - Filter controls
- `/packages/api/src/modules/velocity/velocity.router.ts` - Filter params

**What Exists:**
- **Time filters:** Custom date range (start/end dates)
- **Project filters:** Multi-select project IDs
- **Workspace filters:** Multi-select workspace IDs
- **User filter:** Single user ID

### Issues Found

| Severity | Issue | Description |
|----------|-------|-------------|
| **Medium** | No sprint filter in custom mode | Can't filter by sprint in custom range |
| **Medium** | No quick date presets | No "Last 7 days", "Last month", etc. |
| **Low** | No team filter | Can't filter by multiple team members |
| **Low** | No export functionality | Can't export velocity report as CSV/PDF |

### Missing Elements

- Quick date range presets (This week, Last 30 days, etc.)
- Team-based filtering (multiple users)
- Sprint filtering in custom mode
- Report export (CSV, PDF, image)
- Saved/custom report templates
- Report sharing functionality

---

## 7. Forecasting & Capacity

### Forecasting

**COMPLETED** - Basic implementation exists.

**Files:**
- `/packages/api/src/modules/forecast/forecast.service.ts`
- `/packages/web/src/lib/components/ForecastView.svelte`

**What Exists:**
- Average velocity from last 3 completed sprints
- Sprint-by-sprint breakdown with estimated dates
- Progress bars for each sprint allocation
- Handles edge cases (no backlog, no completed sprints, zero velocity)

### Issues Found

| Severity | Issue | Description |
|----------|-------|-------------|
| **Low** | Uses plannedPoints, not actual completed | Velocity calculation could be inaccurate |
| **Low** | No forecast accuracy tracking | No comparison of predicted vs actual |

---

### Capacity Planning

**COMPLETED**

**Files:**
- `/packages/api/src/modules/sprint/capacity.service.ts`
- `/packages/api/src/modules/sprint/capacity.router.ts`
- `/packages/web/src/lib/components/CapacityTable.svelte`

**What Exists:**
- Per-sprint, per-employee capacity hours
- Estimated hours total per employee
- Overload detection and warnings
- Notes for capacity adjustments
- Employee detail page link from capacity table

---

## 8. Additional Missing Features

### Missing from Phase 4 Spec

| Feature | Status | Spec Reference |
|---------|--------|----------------|
| Global velocity page | **EXISTS** | `routes/(app)/velocity/+page.svelte` |
| Workspace velocity page | **MISSING** | Spec line 38 |
| Sprint velocity trend | **MISSING** | Not in spec but implied |
| Velocity chart library | **MISSING** | No chart dependencies |

### Missing from v2 Design Spec

| Feature | Status | Notes |
|---------|--------|-------|
| Velocity history per sprint (employee page) | **PARTIAL** | Only 90-day aggregate exists |
| Bar/metric display for sprint velocity | **MISSING** | Only numbers displayed |

---

## Summary of Findings

### Critical Issues (Must Fix)

1. **No workspace-scoped velocity page** - Spec explicitly requires `/workspace/[id]/velocity` route
2. **No visual charts** - Velocity metrics are only shown as numbers, no trend visualization

### High Priority Issues

1. **No sprint-to-sprint velocity comparison** - Cannot view velocity history across sprints
2. **No historical velocity data** - No per-sprint velocity breakdown for users
3. **No burndown/burnup charts** - Missing sprint progress visualization

### Medium Priority Issues

1. **Employee page lacks sprint velocity history** - Only shows 90-day aggregate
2. **No quick date presets** - Users must manually select date ranges
3. **No sprint filter in custom mode** - Cannot filter by sprint in custom date range
4. **No team-based filtering** - Cannot filter by multiple users

### Low Priority Issues

1. **No report export** - Cannot export velocity data
2. **No forecast accuracy tracking** - No comparison of predicted vs actual
3. **95-day hardcoded filter** - Not configurable
4. **No velocity caching** - Performance concern at scale

---

## Recommendations

### Priority 1 (Critical)

1. **Implement workspace velocity page** - Add `/workspace/[wid]/velocity` route per spec
2. **Add chart library** - Install a chart library (recommend Chart.js or lightweight alternative)
3. **Create velocity trend component** - Show last N sprints velocity as bar/line chart

### Priority 2 (High)

4. **Enhance employee page** - Add per-sprint velocity history with visualization
5. **Add quick date presets** - Improve UX with common date range selections
6. **Add burndown/burnup charts** - Sprint progress visualization

### Priority 3 (Medium)

7. **Consider velocity caching** - For performance at scale
8. **Add report export** - Allow CSV/PDF export of velocity data
9. **Add team filtering** - Support filtering by multiple users