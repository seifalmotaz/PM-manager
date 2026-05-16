# Timesheet

## Purpose

Org-level time tracking across all organizations or for a specific organization. Displays weekly sessions showing when engineers clocked in/out, which org they worked for, and what tasks were completed.

## Routes

- **Unified Timesheet**: `/timesheet` — Shows all org sessions across all organizations the user belongs to
- **Org-Scoped Timesheet**: `/:orgSlug/timesheet` — Shows only sessions for the specified organization

## Features

### Week Navigation

- Default: current week (Monday–Sunday)
- Navigate to previous/next week using ← Previous / Next → buttons
- Week range displayed as "May 12 – May 18, 2026"

### Session Display

Each session row shows:
- **Day**: Day name and date (e.g., "Mon 12")
- **Org Badge**: Organization name with color-coded badge
- **Start Time**: When the session started (e.g., "9:15 AM")
- **End Time**: When the session ended (e.g., "5:30 PM") or "—" for live sessions
- **Duration**: Total time (e.g., "8h 15m") or "Live" badge for active sessions
- **Tasks**: Number of tasks completed during session
- **SP**: Total story points completed during session
- **Status**: Badge indicating session state:
  - **Live**: Active session (green badge)
  - **Auto**: System auto-created session (gray badge)
  - **Locked**: Frozen session from completed sprint (gray badge)

### Week Totals

At the bottom of the table:
- Total duration for the week
- Total tasks completed
- Total story points

### Empty State

If no sessions exist for the selected week:
- Calendar illustration
- Message: "No sessions recorded this week. Start working to track your time."

## Data Source

- Backend endpoint: `timesheet.listByWeek`
- Parameters:
  - `weekStart`: ISO datetime string
  - `weekEnd`: ISO datetime string
  - `organizationId`: optional (if omitted, returns all orgs)
- Response: `WeekData` object with days array, each containing sessions

## Technical Details

- Sessions are grouped by `startTime` date
- Live session duration is computed client-side (elapsed time from start)
- Auto-created sessions have `note === 'System auto-created'`
- Frozen sessions have `frozen === true`
- Organization badges use consistent colors via hash function

## Related Features

- L1: Clock-in/out creates org sessions
- L2: Task auto-enrichment populates session data
- L3: Timesheet views (this feature)