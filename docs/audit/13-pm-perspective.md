# Product Manager Perspective Audit

**Audit Date:** May 15, 2026  
**Persona:** Jordan Chen - Product Manager  
**Focus:** Sprint planning, velocity tracking, backlog management, team coordination, multi-workspace management

---

## Persona Profile

### Jordan Chen - Product Manager

**Role:** Product Manager (Mid-level, 3-5 years experience)  
**Context:** Manages products for multiple workspaces (day job + freelance)  
**Technical Background:** Former developer, understands technical debt and realistic estimates

**Goals:**
1. Deliver predictable value - Hit sprint commitments consistently
2. Maintain team health - Avoid burnout, ensure developers aren't overallocated
3. Keep visibility across contexts - Know what's happening in day job AND freelance projects
4. Build PM muscle memory - Get better at estimation, velocity tracking
5. Protect confidentiality - Never accidentally reveal client names during screen shares

**Time Constraints:**
- No dedicated "PM time" — constant execution mode
- 40% of time in meetings
- 1-2 hours/day for deep work (backlog refinement)

---

## Critical User Stories

### Sprint Planning Stories

1. **Create sprint with dates** - Match team's working rhythm
2. **View sprint capacity** - Prevent overallocation BEFORE sprint starts
3. **Drag tasks to sprint** - Quickly adjust scope during planning
4. **Set story points during creation** - Estimate complexity
5. **See planned vs. completed in real-time** - Answer "are we on track?"
6. **Flag tasks as unplanned** - Explain velocity variance
7. **Lock completed sprint** - Permanent velocity snapshot

### Backlog Management Stories

1. **Create task with NLP** - "Fix login bug p1 today @jordan sp:3"
2. **View all unassigned tasks** - Prioritize unassigned work
3. **Set priority levels** - P0-P3 sorting
4. **Assign to team members** - Plan capacity before sprint
5. **Filter by assignee, project, priority** - Answer targeted questions
6. **See task creation date** - Identify stale tasks

### Velocity Reporting Stories

1. **See sprint velocity trends** - Identify performance patterns
2. **Calculate velocity for custom dates** - Report on quarterly progress
3. **View estimated vs. actual hours** - Improve estimation accuracy
4. **Export velocity data** - Prepare stakeholder reports
5. **Compare planned vs. completed** - Answer "did we ship what we planned?"

### Team Coordination Stories

1. **See team member workload** - Understand workload distribution
2. **Assign task and see it reflect immediately** - Seamless coordination
3. **View employee velocity history** - Give data-informed feedback
4. **Post comments with @mentions** - Notify team members
5. **See activity timeline per task** - Understand task history

---

## User Journey Analysis

### Daily Workflow

**Morning (8:30-9:00 AM):**
| Step | Action | Feature Needed |
|------|--------|----------------|
| 1 | Open Saha | Home view with all tasks |
| 2 | Check overdue count | Overdue warning badge |
| 3 | Switch workspace | Workspace filter dropdown |
| 4 | Review In Progress | Kanban (multi-project view) |
| 5 | Check capacity | Capacity table |
| 6 | Scan notifications | Notification bell |

**Mid-Morning (9:00 AM - 12:00 PM):**
| Step | Action | Feature Needed |
|------|--------|----------------|
| 7 | Daily standup | Activity feed per task |
| 8 | Identify blocked tasks | Task status + comments |
| 9 | Update sprint board | Drag-and-drop |
| 10 | Quick-add new tasks | NLP quick-add |

**Late Afternoon (4:00-5:00 PM):**
| Step | Action | Feature Needed |
|------|--------|----------------|
| 18 | Monitor in-progress tasks | Due date on task cards |
| 19 | Search for specific task | Cmd+K global search |
| 20 | Flag tasks stuck in Review | Column dwell time |

---

## Audit Results: Flow Completeness

### Sprint Planning Flow
**Score: 6/10**

| Step | Works? | Issue |
|------|--------|-------|
| Create sprint | ❌ | No visible button on Sprint Board page |
| Set capacity | ✅ | Capacity table functional |
| Assign tasks | ⚠️ | Backlog works but no bulk ops |
| See capacity vs. assigned | ⚠️ | No unestimated tasks warning |
| Sprint goal field | ❌ | Not visible in UI |
| Complete sprint | ❌ | No manual completion action |

### Velocity Tracking Flow
**Score: 5/10**

| Step | Works? | Issue |
|------|--------|-------|
| View sprint velocity | ✅ | Velocity page shows metrics |
| See velocity trends | ❌ | NO CHARTS OR VISUALIZATIONS |
| Compare sprints | ❌ | View one sprint at a time |
| Export for stakeholders | ❌ | NO EXPORT FUNCTIONALITY |
| Per-member velocity | ⚠️ | Only 90-day aggregate |

### Backlog Management Flow
**Score: 7/10**

| Step | Works? | Issue |
|------|--------|-------|
| View unassigned tasks | ✅ | Backlog page exists |
| Assign to sprint | ✅ | Sprint dropdown in backlog |
| Bulk assign | ❌ | No multi-select |
| Sort/filter | ❌ | No filtering in backlog |
| See story points | ⚠️ | Not shown in backlog view |

---

## Critical Issues Affecting PM

### Priority: Critical

1. **No Sprint Creation Button**
   - SprintCreateModal exists but no trigger on Sprint Board
   - PMs cannot create sprints discoverably
   - **Impact:** Cannot start sprint planning

2. **No Sprint Completion Workflow**
   - No "Mark Sprint Complete" action
   - Expected: Sprint → Complete → Snapshot velocity
   - **Impact:** Sprint lifecycle incomplete

3. **No Velocity Charts**
   - Velocity page shows only numbers
   - No trend line, no sprint comparison
   - **Impact:** Cannot track performance over time

4. **No Export Functionality**
   - Cannot create stakeholder reports
   - Cannot present to leadership
   - **Impact:** Manual work to report metrics

### Priority: High

5. **Sprint Flags Not Manageable**
   - Flags like "unscheduled", "pulled_forward" exist in backend
   - Zero UI to view or edit flags
   - **Impact:** Cannot explain velocity variance

6. **Capacity Missing Unestimated Warning**
   - Capacity table doesn't show unestimated task count
   - PMs cannot trust capacity numbers
   - **Impact:** Sprint planning based on incomplete data

7. **No Bulk Task Operations**
   - Must assign tasks one at a time during planning
   - **Impact:** Planning sessions take 2x longer

### Priority: Medium

8. **Backlog Filtering Missing**
   - Large backlogs become unmanageable
   - Cannot find tasks by priority, assignee, date

9. **Command Palette Limited**
   - No sprint-specific commands
   - Cannot navigate directly to specific sprint

---

## Feature Gap Matrix

| Feature | PM Needs | Priority | Status |
|---------|----------|----------|--------|
| Sprint creation button | Must-have | P0 | Missing |
| Sprint completion workflow | Must-have | P0 | Missing |
| Velocity trend charts | Must-have | P0 | Missing |
| Export velocity | Must-have | P0 | Missing |
| Sprint flags UI | Should-have | P1 | Missing |
| Unestimated warning in capacity | Should-have | P1 | Missing |
| Bulk task operations | Should-have | P1 | Missing |
| Backlog filtering | Should-have | P1 | Missing |
| Sprint goal display | Nice-to-have | P2 | Missing |
| Sprint templates | Nice-to-have | P3 | Missing |

---

## User Story Coverage

| Category | Defined | Covered | Coverage |
|----------|---------|---------|----------|
| Sprint planning | 8 | 5 | 63% |
| Backlog management | 8 | 4 | 50% |
| Team coordination | 8 | 6 | 75% |
| Reporting | 8 | 3 | 38% |
| Communication | 5 | 4 | 80% |
| **Total** | **37** | **22** | **59%** |

---

## Efficiency Analysis

### Click Counts for Common PM Tasks

| Task | Clicks | Status |
|------|--------|--------|
| Create sprint | N/A | Missing |
| View velocity for sprint | 2 | Good |
| Check team capacity | 3 | OK |
| Assign backlog task to sprint | 3 | Improve |
| Create task + assign to sprint | 4+ | Poor |
| Create task + set priority | 1 | Good (NLP) |
| Export velocity report | N/A | Missing |
| Complete sprint | N/A | Missing |

### Navigation Friction

| Navigation | Clicks | Issue |
|------------|--------|-------|
| Sprint board from projects | 2 | Projects → Sprints tab |
| Member profile from capacity | 1 | Link exists |
| Backlog from sprint | 1 | Sub-tab navigation |
| Velocity from home | 1 | Sidebar direct |

---

## Recommendations

### Immediate (P0)

1. **Add Sprint Creation Button**
   - Location: Sprint selector bar on Sprint Board
   - Also add to Command Palette (">new-sprint")

2. **Add Sprint Completion Action**
   - "Complete Sprint" button in sprint header
   - Confirmation dialog with velocity summary

3. **Add Basic Velocity Charts**
   - Line chart: last 6 sprints
   - Minimum: completed vs. planned

4. **Implement Export**
   - CSV export from Velocity page
   - PDF summary for stakeholders

### Short-Term (P1)

5. **Sprint Flags UI**
   - Badge on task cards
   - Dropdown in TaskDetail panel
   - Filter tasks by flag type

6. **Unestimated Tasks Warning**
   - Row in Capacity table showing count
   - Link to tasks without estimates

7. **Bulk Task Operations**
   - Select multiple tasks in backlog
   - Bulk assign to sprint

8. **Enhance Command Palette**
   - Add sprint navigation commands
   - Show context-aware actions

### Medium-Term (P2)

9. **Sprint Progress Bar**
   - Visual progress in sprint header
   - X/Y points completed

10. **Member Velocity Trends**
    - Sprint-by-sprint in profile
    - Trend visualization

---

## Conclusion

**Overall Score: 6/10 - Foundations exist but critical workflows are incomplete**

The PM-manager application provides solid foundations for sprint management, velocity tracking, and capacity planning. However, PMs cannot complete their core workflows:

**Blocking Issues:**
- Cannot create sprints (no button)
- Cannot complete sprints (no action)
- Cannot see trends (no charts)
- Cannot export reports (no functionality)

**Recommended Fix Priority:**
1. Add sprint creation/completion UI
2. Add velocity visualizations
3. Add export functionality
4. Add sprint flag management

Without these fixes, PMs must use external tools for sprint planning and stakeholder communication, undermining the value of the application.