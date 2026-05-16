# Velocity Chart & Metrics

## Purpose

Visualize team velocity over time with planned vs completed story points, estimation accuracy metrics, and personal contribution breakdown.

## Route

- **Velocity Page**: `/:orgSlug/velocity` — Organization-scoped velocity visualization

## Features

### Sprint Velocity Bar Chart

A grouped bar chart showing the last 8 completed sprints:

- **X-axis**: Sprint names (chronological order)
- **Y-axis**: Story points
- **Two bars per sprint**:
  - Planned SP (outline, gray)
  - Completed SP (filled, brand color)

#### Interactions

- **Hover**: Tooltip shows exact values and percentage (e.g., "Sprint 4: Planned: 35 SP / Completed: 28 SP (80%)")
- **Click**: Navigate to that sprint's board (`:orgSlug/project/:projectId/sprints?selected=:sprintId`)

#### Empty State

If no completed sprints exist:
- Chart illustration with question mark
- Message: "Complete your first sprint to see velocity trends."

### Estimation Accuracy Metrics

Three metric cards displayed below the chart:

1. **Throughput Accuracy**
   - Formula: `Avg(completed SP / planned SP × 100)`
   - Color-coded badge:
     - Green: ≥90%
     - Yellow: 70-89%
     - Red: <70%
   - Description: "Avg. completed vs. planned"

2. **Time Efficiency**
   - Formula: `Avg(total estimated hours / total session hours × 100)`
   - Computed per sprint: sum of `estimatedHours` for completed tasks / sum of session hours overlapping sprint
   - Color-coded badge (same thresholds)
   - Description: "Estimate accuracy"
   - Tooltip: "Were our estimates realistic?"

3. **Accuracy Trend**
   - Inline display: "Sprint 1: 85% → Sprint 2: 92% → Sprint 3: 78% → Sprint 4: 95%"
   - Shows throughput accuracy per sprint
   - "N/A" shown for sprints with 0 planned SP

### Personal Velocity

A collapsible section showing individual contribution:

- **Default state**: Expanded
- **Table columns**:
  - Sprint Name
  - Tasks Completed (by user)
  - SP Completed (by user)
  - Team Total SP
  - My Share (percentage)

- **Average Share**: Footer row showing average personal contribution percentage
- **Edge cases**:
  - "—" displayed for sprints where user had no tasks
  - Excluded from average calculation

## Data Source

- Backend endpoints:
  - `velocity.chart` — Returns sprint velocity data and time efficiencies
  - `velocity.personal` — Returns per-sprint personal contribution

### Chart Query Parameters

```typescript
{
  projectId?: string // Filter by specific project (velocity is project-scoped)
  limit?: number // Default: 8 sprints
}
```

### Personal Query Parameters

```typescript
{
  projectId?: string // Filter by specific project
  userId?: string // Default: current user
}
```

## Technical Details

- **Planned SP**: Stored on `sprints.plannedPoints` (set on completion in L2)
- **Completed SP**: Computed on read via `velocityService.computeVelocity()`
- **Time Efficiency**: Computed by summing `estimatedHours` for completed tasks in sprint, divided by total session hours overlapping sprint dates
- **Personal SP**: Computed by filtering completed tasks by `assigneeId`
- **Scoped by project**: Velocity endpoints use `projectId` for filtering. To view velocity for an org, query velocity for all projects within that org.
- **Database index**: `idx_sprints_status_enddate` on `sprints(status, end_date DESC)` for efficient querying

## Related Features

- L2: Sprint completion sets `plannedPoints`
- L2: Task auto-enrichment populates session data
- L3: Velocity visualization (this feature)