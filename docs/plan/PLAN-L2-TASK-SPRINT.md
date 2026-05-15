# Saha — Level 2: Task & Sprint Flow

**Version:** 2.0  
**Date:** May 15, 2026  
**Status:** Approved  
**Type:** Product Requirements & Specification

---

## Objective

Complete the PM workflow cycle. Sprint creation becomes discoverable. Sprint completion locks everything and creates velocity snapshots. Task auto-capture replaces manual time tracking. Sprint flags become manageable. The simplified status model is enforced.

---

## Decision Log (Grilled Questions & Answers)

### Decision 1: Keep or remove the "review" status?

**Question:** The current app has four statuses: `todo → in_progress → review → done`. The "review" status creates ambiguity: does the engineer's completion count at "review" (they finished coding) or at "done" (reviewer approved)? If at "done", the engineer's throughput depends on someone else's speed. If at "review", velocity can inflate before quality is confirmed.

**Resolution:** Remove "review." Simplified model: `todo → in_progress → done`.

**Rationale (Product Owner's words):** For now, three statuses. Review workflow lives outside Saha — PR approval in GitHub, PM checks in standup. Can add "review" back later as one column + one timestamp. It's a column, not an architecture decision.

**Impact on existing data:** All tasks currently in "review" status are migrated to "in_progress" during L2 migration.

**Transition rules:** Adjacent-only. `todo → done` is blocked. `done → todo` is blocked (must go through `in_progress`). Drag-and-drop validates transitions; invalid drops show an error toast (L4 feature, but the validation logic is in L2).

---

### Decision 2: Sprint creation — where's the button?

**Question:** The audit found: "SprintCreateModal exists but no visible button to open it on Sprint Board page. PMs cannot discoverably create sprints."

**Resolution:** A "New Sprint" button in the sprint board header, next to the sprint selector dropdown. Always visible. Always clickable.

**Flow:**
1. PM clicks "New Sprint"
2. SprintCreateModal opens with fields: name (required), goal (optional), start date, end date
3. Default end date = start date + `defaultSprintLengthDays` from `organization_settings`
4. Validation: start date must be before end date
5. On create: sprint appears in the selector dropdown, auto-selected

**Also add to places:** The sprint selector dropdown gets a "+" option at the bottom, but the primary button is the visible "New Sprint" in the header. Two paths to the same modal for different usage patterns.

---

### Decision 3: Sprint completion — what exactly happens?

**Question:** When a PM clicks "Complete Sprint," what sequence of events occurs?

**Resolution:** Step-by-step sequence:

1. **PM clicks "Complete Sprint"** — button visible only for active sprints, in the sprint board header next to the sprint name.

2. **Confirmation dialog** — Shows sprint name, dates, count of completed tasks, count of unfinished tasks.

3. **Unfinished tasks decision** — Binary choice: "Move all unfinished tasks to Backlog" OR "Move all unfinished tasks to Next Sprint." No per-task granularity (kept simple for speed).

4. **On confirm:**
   - Sprint status changes to `completed` (locked).
   - Sprint becomes immutable: no new tasks can be added. No existing task statuses can change.
   - All `org_sessions` that overlap the sprint's date range are frozen (`frozen = true`). Frozen sessions become immutable — no recomputation, no retroactive edits.
   - Velocity snapshot computed: planned vs actual for all completed tasks in sprint window.
   - Unfinished tasks moved per the PM's choice (bulk update `sprintId` to null for backlog, or to next sprint's ID).
   - Audit log entry created for the sprint completion.

5. **Result:** The sprint appears in the "Completed" section of the sprint board with reduced opacity. Its velocity is a permanent frozen snapshot viewable in the velocity page (L3).

**Why freeze org_sessions:** If we don't freeze them, an engineer can retroactively adjust a time entry from two weeks ago and the sprint's velocity silently changes. The PM who reported "we shipped 28 SP" to stakeholders now has incorrect data. Freezing prevents silent data corruption.

---

### Decision 4: Task auto-capture — when and how?

**Question:** When a task moves to "done," what data is auto-captured and where does it go?

**Resolution:** The system auto-captures completion data from the task's own timestamps and records it against the active org session.

**Data captured:**
- `completedAt` — when task entered "done" (from the task row)
- `startedAt` — when task entered "in_progress" (from the task row)
- `storyPoints` — complexity estimate
- `estimatedHours` — time estimate
- Elapsed = `completedAt - startedAt` (wall-clock time, computed on read, not stored)

**Where the data goes:** It feeds into the `org_sessions` auto-enrichment. Specifically:
- If an active org session exists AND the task's org matches the session's org → the session's `tasksCompleted`, `storyPointsCompleted`, `estimatedHoursSum` increment on clock-out.
- If no active session exists → system auto-creates a minimal `org_sessions` row (backdated to `startedAt`, endTime = `completedAt`, flagged as "System auto-created").
- If the session is from a different org → cross-org prompt appears (defined in L1).

**When auto-enrichment fires:** On clock-out. Not on every task completion. This means the session's enrichment fields are zero until the user clicks Stop. If the user completes 3 tasks during an active session, drags them all to Done, the session still shows 0 tasks until they clock out.

**Rationale:** Deferred enrichment avoids mid-session recomputation overhead. The timesheet and velocity views (L3) read from the enriched session data, not from live task counts.

---

### Decision 5: Retroactive task completion — can you mark a task done from yesterday?

**Question:** Engineer realizes at 9 AM they forgot to mark a task Done yesterday at 4 PM. They drag it to Done now. What happens?

**Resolution (Option A from grilling):** Recompute the affected org session.

**Behavior:**
1. Task's `completedAt` is set to now (or the user can backdate it).
2. The system finds the `org_sessions` row that covers this time period for this user and org.
3. If found AND the session is not frozen: recompute enrichment fields (tasksCompleted, storyPointsCompleted, estimatedHoursSum). The session's `updatedAt` is set to current time.
4. If found BUT the session is frozen (sprint completed): REJECT the completion. Message: "This sprint is completed. You cannot modify tasks from completed sprints."
5. If no session found: auto-create a minimal session (same as the "no active session" case).

**Sprint metrics impact:** Sprint velocity remains live until the sprint is completed. If a retroactive completion falls within an active sprint's window, the sprint's metrics update. If the sprint is completed (frozen), the retroactive completion is rejected.

---

### Decision 6: Sprint flags — who sets them and when?

**Question:** The domain model defines four sprint flags: `unscheduled`, `pulled_forward`, `emergency`, `reopened`. Who can assign them? When are they auto-assigned vs. manually set?

**Resolution:**

**Auto-assignment trigger:** When a task is dragged into an active sprint AND the task wasn't already in that sprint before it became active → auto-assign `unscheduled`.

**Manual assignment:** Only PM and Admin roles can change sprint flags. Engineers cannot change flags.

**Flag values and their meaning:**

| Flag | Auto or Manual | Meaning |
|------|---------------|---------|
| `unscheduled` | Auto (default) | New work that came up unexpectedly mid-sprint |
| `pulled_forward` | Manual only | Work moved from a future sprint into the current sprint |
| `emergency` | Manual only | Critical bug/issue that must be handled immediately |
| `reopened` | Auto | Task was marked Done, then dragged back to active sprint |
| `null` | Default (planned) | Task was planned before the sprint started. No flag needed. |

**Where flags are visible:**
- Task detail panel (as a badge or dropdown)
- Velocity report (grouped by flag type)
- Task cards in sprint board (optional, as a small indicator)

---

### Decision 7: What happens to unfinished tasks at sprint end?

**Question:** Sprint completes. 5 tasks are still in "In Progress" or "To Do." What happens to them?

**Resolution (Option A from grilling):** Binary choice in the completion dialog.

**PM chooses:**
- **Move to Backlog** — all unfinished tasks get `sprintId = null`. They appear in the backlog view.
- **Move to Next Sprint** — all unfinished tasks get the next sprint's ID. If no next sprint exists, they go to backlog.

**No per-task granularity.** The PM cannot pick "Task A → backlog, Task B → next sprint, Task C → backlog." This was a deliberate simplification for speed. Per-task selection can be added later if PMs ask for it.

---

## User Stories (L2 Scope)

### PM Stories — Sprint Lifecycle

| ID | Story | Acceptance |
|----|-------|------------|
| SL-01 | As a PM, I want a visible "New Sprint" button so I can create sprints without hunting for hidden functionality. | Button visible on sprint board. Click opens modal. |
| SL-02 | As a PM, I want sprint end dates to auto-suggest based on org defaults so I create sprints faster. | Default end date = start date + `defaultSprintLengthDays`. |
| SL-03 | As a PM, I want to complete a sprint with one click so the sprint lifecycle is complete. | "Complete Sprint" button visible for active sprints. |
| SL-04 | As a PM, I want to choose where unfinished tasks go when a sprint ends so I control work flow. | Dialog offers "Backlog" or "Next Sprint." |
| SL-05 | As a PM, I want completed sprints to be locked and frozen so velocity data cannot silently change. | Completed sprint: no new tasks, no status changes. Sessions frozen. |
| SL-06 | As a PM, I want sprint flags auto-assigned for tasks added mid-sprint so I don't have to manually flag every unplanned task. | Drag to active sprint → auto-assigns `unscheduled`. |
| SL-07 | As a PM, I want to manually change sprint flags so I can accurately categorize why work was added mid-sprint. | Dropdown in TaskDetail panel. PM/Admin only. |
| SL-08 | As a PM, I want flags visible in the velocity report so I can explain velocity variance in retrospectives. | Flagged tasks listed. Grouped by flag type. |

### Engineer Stories — Task Auto-Capture

| ID | Story | Acceptance |
|----|-------|------------|
| TC-01 | As an engineer, I want tasks to auto-capture completion data when I drag them to Done so I don't need a per-task timer. | Auto-capture fires on status change to "done." Data recorded against org session or auto-created session. |
| TC-02 | As an engineer, I want the system to handle missing sessions gracefully so I'm never blocked from completing tasks. | If no session exists → auto-creates minimal session. |
| TC-03 | As an engineer, I want retroactive task completions to work so I can fix forgotten updates. | Recomputation updates the affected org_session if not frozen. |

---

## User Journey: PM's Sprint Cycle

**Sprint Planning (Monday, 10:00 AM):**
1. PM opens `/:acme-corp/project/website/sprints`.
2. Sees sprint board with "No active sprints." Clicks "New Sprint."
3. Modal: names it "Sprint 6," sets dates (May 19–June 2, auto-suggested from defaults).
4. Sprint created. Appears selected in the dropdown.
5. Navigates to Backlog tab. Sees 12 unassigned tasks.
6. Uses sprint assignment dropdown to assign tasks to Sprint 6. (No bulk assignment in L2 — that's future.)
7. Switches to Capacity tab. Sees team capacity: Sarah 40h, Alex 40h, Ahmed 32h (PTO on Friday).
8. Adjusts Ahmed's capacity to 32h. Overload warning appears: "Alex: 45 estimated hours. Exceeds 40h capacity."

**Mid-Sprint (Wednesday):**
9. PM checks sprint board. Sees 3 tasks in Done (11 SP), 5 in Progress, 2 in To Do.
10. One task shows flag: "unscheduled" — it was added yesterday when an urgent bug came in.
11. PM changes the flag from "unscheduled" to "emergency" via the TaskDetail dropdown.

**Sprint End (Friday, June 2):**
12. PM checks sprint board. 7 tasks Done (24 SP), 2 tasks still In Progress.
13. Clicks "Complete Sprint."
14. Dialog: "Sprint 6: May 19–June 2. 7 tasks completed (24 SP). 2 tasks unfinished."
15. Chooses "Move to Next Sprint" (Sprint 7 starts Monday).
16. Confirms. Sprint 6 locks. The 2 unfinished tasks move to Sprint 7 with "unscheduled" flags.
17. Velocity snapshot is computed: planned 35 SP, completed 24 SP = 69% throughput.
18. All org_sessions overlapping May 19–June 2 are frozen.
19. Sprint 6 appears in "Completed Sprints" section with reduced opacity.

---

## Features Delivered

### Sprint Creation
- "New Sprint" button on sprint board header.
- Modal with name, goal, dates.
- Auto-suggested end date from org settings.
- Sprint appears in selector on create.

### Sprint Completion
- "Complete Sprint" button on sprint board header (active sprints only).
- Confirmation dialog with task counts.
- Binary choice for unfinished tasks (backlog or next sprint).
- Sprint locked on completion.
- All overlapping org_sessions frozen.
- Velocity snapshot computed.

### Task Auto-Capture
- Completion data captured on status change to "done."
- Auto-create session when no active session exists.
- Recomputation on retroactive completion.
- Frozen sessions reject recomputation.

### Sprint Flags
- Auto-assigned on drag to active sprint.
- PM/Admin manual override via TaskDetail.
- Visible in velocity report.
- Four flag values + null (planned).

### Simplified Status Model
- `todo → in_progress → done` (review removed).
- Adjacent-only transitions enforced.
- Invalid transitions rejected.

---

## Routes Affected

| Route | Change |
|-------|--------|
| `/:orgSlug/project/:id/sprints` | "New Sprint" and "Complete Sprint" buttons added to header |
| `/:orgSlug/project/:id/sprints/backlog` | Sprint assignment dropdown functional |
| TaskDetail panel | Sprint flag management added (PM/Admin only) |

---

## Migration Required

### Migration File: `0004_sprint_completion_and_flags.sql`

**Operations:**
1. Add `frozen` column to `org_sessions` (BOOLEAN, default false).
2. Migrate all `review` tasks to `in_progress`.
3. Update any existing sprint with `endDate < NOW()` to `status = 'completed'` and lock them.

---

## Edge Cases Catalog

| Edge Case | Resolution |
|-----------|------------|
| PM completes sprint with no unfinished tasks | No prompt needed. All tasks done. Sprint completes cleanly. |
| PM completes sprint with no tasks at all (empty sprint) | Sprint completes with 0 SP. Velocity = 0/0. No error. |
| Engineer completes task from inactive (completed) sprint | Rejected. "This sprint is completed. You cannot modify tasks from completed sprints." |
| PM changes flag on task in completed sprint | Blocked. Flags are frozen on completed sprints. |
| Two PMs complete the same sprint simultaneously | Last-write-wins (per CONTEXT.md concurrent edit policy). Audit log preserves both attempts. |
| Sprint overlaps with another sprint in the same project | Allowed (per CONTEXT.md line 87). Tasks count toward both sprints' velocity. Sessions frozen for both. |
| Org has no next sprint for unfinished task migration | "Move to next sprint" option is grayed out or not shown. Defaults to backlog. |
| PM drags task from completed sprint to active sprint | Task gets `reopened` flag (auto). Allowed — this is the intended reopening flow. |
| Engineer marks task Done that has no `startedAt` (was never In Progress) | Auto-set `startedAt = completedAt`. Duration = 0. Still credited. |
| Session spans midnight (clock-in at 11 PM, clock-out at 1 AM) | Both days' tasks are captured. Timesheet shows the session on both days (or on the clock-in day — design decision for L3). |
