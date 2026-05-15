# Software Engineer Perspective Audit

**Audit Date:** May 15, 2026  
**Persona:** Alex Chen - Senior Software Engineer  
**Focus:** Task efficiency, time tracking, focus support, personal productivity

---

## Persona Profile

### Alex Chen - Senior Software Engineer

**Role:** Senior Software Engineer (8 years experience)  
**Context:** 3 distinct work identities (day job, freelance, personal projects)  
**Technical Proficiency:** High - keyboard shortcuts, command palettes, expects efficiency

**Work Pattern:**
- Core focus hours: 9 AM - 12 PM (no interruptions)
- Daily standup: 15 min at 9:30 AM
- Sprint planning: Every other Monday, 1 hour
- Afternoon: Responsive to async communication
- Context switches: 10-15 per day

**Goals:**
1. Maintain deep focus during coding sessions
2. Accurately estimate task complexity
3. Track time effortlessly
4. Communicate status clearly
5. Understand task context

**Frustrations with Competitors:**
- Jira: Too heavy, slow, excessive configuration
- Trello: Too simple, lacks sprint/velocity tracking
- Linear: Good but expensive, limited multi-workspace

---

## Critical User Stories

### Task Management Stories

1. **Create tasks quickly with NLP** - Don't lose focus during coding
2. **See all tasks across workspaces** - Understand total workload
3. **Update status by dragging** - Intuitive status management
4. **Add descriptions with markdown** - Self-documenting requirements
5. **Create checklists** - Break down complex work
6. **See timer on current task** - Remember to track time
7. **Filter tasks by assignee** - See my workload fast
8. **See dwell time on tasks** - Know if work is stalled

### Time Tracking Stories

1. **Auto-start timer on status change** - Effortless tracking
2. **See time entry history per task** - Understand actuals
3. **Edit time entries** - Correct mistakes
4. **Log time manually** - Record past work
5. **See total hours this week** - Track accuracy
6. **Compare estimated vs. actual** - Improve estimation

### Sprint Work Stories

1. **See sprint capacity** - Know team availability
2. **Self-assign from backlog** - Pull work proactively
3. **Understand sprint flags** - Know task context
4. **See sprint goal** - Understand objectives

### Personal Productivity Stories

1. **Use Cmd+K to find tasks** - Navigate without mouse
2. **Tasks sorted by priority** - P0s always visible
3. **See overdue tasks prominently** - Critical items visible
4. **Create tasks without all fields** - Capture ideas fast
5. **See tasks due today** - Plan the day
6. **Filter workspaces** - Focus on context
7. **Privacy during screen share** - Protect client names

---

## User Journey Analysis

### Daily Workflow

**Morning Routine (9:00-9:30 AM):**
| Step | Action | Tool/Feature |
|------|--------|--------------|
| 1 | Login | Home view |
| 2 | Check overdue | Deadline badge |
| 3 | Check due today | Home view filter |
| 4 | Check in-progress | Kanban board |
| 5 | Select focus task | Task detail |

**Focus Time (9:30 AM - 12:00 PM):**
| Step | Action | Tool/Feature |
|------|--------|--------------|
| 1 | Start focus task | Timer start |
| 2 | Deep work session | Minimal interruptions |
| 3 | Status updates (rare) | Drag status |

**Afternoon (12:00-5:00 PM):**
| Step | Action | Tool/Feature |
|------|--------|--------------|
| 1 | Code review | Tasks in Review |
| 2 | Async communication | @mentions, comments |
| 3 | Second focus block | Timer running |

**End of Day (5:00-5:30 PM):**
| Step | Action | Tool/Feature |
|------|--------|--------------|
| 1 | Stop timer | Timer stop |
| 2 | Review time logs | Time entry history |
| 3 | Correct missed entries | Edit time |

---

## Audit Results

### Task Management Efficiency
**Score: 8/10**

| Aspect | Status | Notes |
|--------|--------|-------|
| Quick-add speed | ✅ Excellent | Cmd+N → type → Enter (2 interactions) |
| NLP parsing | ✅ Implemented | p1, @username, dates, story points |
| Required fields | ✅ None | Title-only works |
| Keyboard shortcuts | ⚠️ Partial | Cmd+K, Cmd+N work but limited |
| Drag-and-drop | ✅ Works | Smooth column transitions |

**Issues:**
- Cmd+Enter doesn't submit (comment input uses it but other forms don't)
- No keyboard navigation for tasks in Kanban
- No context-sensitive shortcuts

### Time Tracking Flow
**Score: 4/10**

| Aspect | Status | Notes |
|--------|--------|-------|
| Start/stop timer | ✅ Works | Topbar persistence |
| Session persistence | ✅ Works | Survives refresh |
| Timer display | ✅ Works | Shows task + elapsed |
| Time entry history | ❌ MISSING | Can't view past entries |
| Edit entries | ❌ MISSING | No UI |
| Delete entries | ❌ MISSING | No UI |
| Personal timesheet | ❌ MISSING | No daily/weekly view |

**Critical Gaps:**
1. No history view - engineers can't see what they logged
2. No editing - mistakes can't be corrected
3. No timesheet - can't review week's work
4. No task time summary - don't know total time per task

### Sprint Work
**Score: 5/10**

| Aspect | Status | Notes |
|--------|--------|-------|
| View sprint capacity | ✅ Works | Capacity table visible |
| Sprint flags visible | ✅ Works | Show on task cards |
| Sprint goal visible | ❌ Missing | No goal field |
| Self-assign from backlog | ⚠️ Partial | Dropdown works but limited |
| Overload warning | ✅ Works | Red highlight in capacity |

**Issues:**
- No backlog view with easy self-assignment
- Sprint goal not displayed
- Engineer can't see their own capacity summary

### Focus & Flow
**Score: 6/10**

| Aspect | Status | Notes |
|--------|--------|-------|
| Notification bell | ✅ Works | Polls every 30s |
| Notification control | ❌ Missing | No DND mode |
| Quick-add anywhere | ✅ Works | Cmd+N global |
| Command palette | ✅ Works | Cmd+K |
| Focus timer | ❌ Missing | No pomodoro feature |

**Issues:**
- 30-second notification polling is distracting
- No way to suppress notifications temporarily
- No "do not disturb" status
- Timer not integrated into task detail panel

### Task Context
**Score: 6/10**

| Aspect | Status | Notes |
|--------|--------|-------|
| Description field | ✅ Works | But plain text only |
| Markdown support | ❌ Missing | No formatting |
| Code blocks | ❌ Missing | No syntax highlighting |
| Links | ❌ Missing | Not clickable |
| Activity timeline | ✅ Works | Full audit log |
| Comments | ⚠️ Partial | Work but no @mentions |
| Checklists | ✅ Works | Full functionality |

**Issues:**
- Engineers need code blocks, links, PR references
- @mentions mentioned in placeholder but not implemented

---

## Click Count Analysis

### Common Engineer Tasks

| Task | Clicks | Score |
|------|--------|-------|
| Create basic task | 1 (Cmd+N → Enter) | ✅ Excellent |
| Create task with details | 4+ (Quick-add → Detail panel → Edit) | ⚠️ Poor |
| Start timer | 3 (Clock → Search → Select) | ⚠️ OK |
| Stop timer | 1 | ✅ Good |
| View time history | N/A | ❌ Not possible |
| Edit time entry | N/A | ❌ Not possible |
| Check my workload | 2 (Home → Check tasks) | ✅ Good |
| Assign to sprint | 4+ (Task → Details → Sprint dropdown → Select) | ⚠️ Poor |
| Update status | 1 (Drag) | ✅ Excellent |

---

## Critical Issues Affecting Engineers

### Priority: Critical

1. **No Time Entry History**
   - Backend exists to track time
   - No UI to view past entries
   - **Impact:** Cannot audit own time, cannot correct mistakes

2. **No Personal Timesheet View**
   - Engineers cannot see week's work
   - Cannot review daily/weekly totals
   - **Impact:** Time tracking is incomplete workflow

### Priority: High

3. **No @Mentions Implementation**
   - Placeholder text says "(@ to mention)"
   - No autocomplete dropdown
   - No notification on mention
   - **Impact:** Collaboration is limited

4. **No Personal Velocity Dashboard**
   - Velocity shows sprint aggregate
   - Engineers can't see their own trends
   - **Impact:** Cannot self-improve estimation

5. **Plain Text Descriptions**
   - No markdown rendering
   - No code blocks, links, formatting
   - **Impact:** Requirements cannot reference code, PRs, docs

6. **No Sprint Goal Field**
   - Sprints have name and dates
   - No goal/objective description
   - **Impact:** Engineers don't understand sprint purpose

### Priority: Medium

7. **Timer Not Integrated into Task Detail**
   - Can only start from topbar dropdown
   - **Impact:** Extra clicks when viewing task

8. **No Backlog Self-Assignment Workflow**
   - Backlog view exists but limited
   - Cannot quickly "claim" unassigned tasks
   - **Impact:** Sprint participation is passive

---

## Feature Gap Matrix

| Feature | Engineer Needs | Priority | Status |
|---------|---------------|----------|--------|
| Time entry history | Must-have | P0 | Missing |
| Personal timesheet | Must-have | P0 | Missing |
| Edit time entries | Must-have | P0 | Missing |
| @mentions | Should-have | P1 | Missing |
| Personal velocity | Should-have | P1 | Missing |
| Rich text descriptions | Should-have | P1 | Missing |
| Sprint goal field | Should-have | P1 | Missing |
| Focus mode | Nice-to-have | P2 | Missing |
| Task templates | Nice-to-have | P3 | Missing |

---

## User Story Coverage

| Category | Defined | Covered | Coverage |
|----------|---------|---------|----------|
| Task management | 8 | 6 | 75% |
| Time tracking | 8 | 2 | 25% |
| Sprint work | 8 | 4 | 50% |
| Collaboration | 8 | 4 | 50% |
| Personal productivity | 8 | 3 | 38% |
| **Total** | **40** | **19** | **48%** |

---

## Competitive Gap Analysis

| Feature | Saha | Linear | Height | Asana |
|---------|------|--------|--------|-------|
| Quick-add NLP | ✅ | ✅ | ✅ | ❌ |
| Time tracking | Basic | Integration | ✅ Built-in | Integration |
| Personal velocity | ❌ | ✅ | ❌ | ✅ |
| Rich text | ❌ | ✅ | ✅ | ✅ |
| @mentions | ❌ | ✅ | ✅ | ✅ |
| Focus mode | ❌ | ❌ | ✅ | ❌ |
| Sprint goals | ❌ | ❌ | ✅ | ✅ |
| Task templates | ❌ | ✅ | ✅ | ✅ |
| Keyboard nav | Basic | Excellent | Good | Poor |

---

## Recommendations

### Immediate (P0)

1. **Time Entry History View**
   - Add to TaskDetail panel
   - Show: start, end, duration per entry
   - Total hours at bottom

2. **Time Entry Editing**
   - Edit start/end time
   - Delete entry
   - Add manual entry

3. **Personal Timesheet**
   - New view: /timesheet
   - Daily/weekly breakdown
   - By project breakdown

### Short-Term (P1)

4. **@Mentions Implementation**
   - Autocomplete dropdown in CommentInput
   - Notify mentioned users
   - Link to user profile

5. **Personal Velocity View**
   - Add to employee profile
   - Sprint-by-sprint breakdown
   - Simple trend line

6. **Rich Text Descriptions**
   - Markdown rendering
   - Code blocks with syntax highlighting
   - Clickable links

7. **Sprint Goal Display**
   - Add to sprint creation
   - Show in sprint header

### Medium-Term (P2)

8. **Focus Mode Toggle**
   - "Focus Mode" in user menu
   - Pause notifications
   - Status shows "In Focus Mode"

9. **Timer in Task Detail**
   - "Start Timer" button in task panel
   - Show running timer for current task

10. **Recent Tasks in Timer**
    - "Continue timer" option
    - Reduce friction for toggling

---

## Conclusion

**Overall Score: 5/10 - Solid foundation with critical gaps**

The PM-manager application provides useful tools for engineers but misses critical features for the time tracking workflow:

**Working Well:**
- Quick task creation with NLP parsing
- Timer persistence across sessions
- Multi-workspace support
- Activity timeline for context
- Clean UI with command palette

**Blocking Issues:**
- Time tracking is half-implemented (start/stop works, but no history/edit)
- Cannot collaborate effectively (@mentions missing)
- Cannot understand sprint context (goal field missing)
- Cannot self-improve (personal velocity missing)

**Recommended Fix Priority:**
1. Complete time tracking UI (history/edit/timesheet)
2. Implement @mentions for collaboration
3. Add personal velocity insights
4. Add rich text descriptions

Without time history and editing, engineers cannot use time tracking for estimation accuracy improvement or billing purposes. This undermines a core value proposition.