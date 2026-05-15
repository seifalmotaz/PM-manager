# Saha — Level 1: Multi-Org Core

**Version:** 2.0  
**Date:** May 15, 2026  
**Status:** Approved  
**Type:** Product Requirements & Specification

---

## Objective

Ship the core multi-organization experience that differentiates Saha. An engineer can switch between work identities, clock in/out per org, and see all their tasks in one unified view. This is the acquisition hook — the feature that makes individual users adopt Saha and bring it into their company.

---

## Decision Log (Grilled Questions & Answers)

### Decision 1: Route structure — org-in-URL or org-in-store?

**Question:** Should the active organization be part of the URL (like Slack: `slack.com/acme-corp`) or stored in client state without affecting URLs (like the current app)?

**Resolution:** Org-in-URL. Slack-style prefixed routes.

**Routes:**
- `/` → My Work (unified, cross-org view)
- `/:orgSlug` → Per-org Home
- `/:orgSlug/projects` → Org projects
- `/:orgSlug/project/:id/kanban` → Project Kanban
- `/:orgSlug/project/:id/sprints` → Sprint board

**Rationale:**
- Enables deep linking: sharing a URL to "Acme Corp's sprint board" works because the org is in the URL.
- Matches the mental model engineers already have from Slack.
- Old `/home`, `/projects`, `/velocity` routes are all removed.

**Rejected alternative:** Org in store only. Simpler migration (no route changes), but URLs lose context and bookmarking org-specific pages is impossible.

---

### Decision 2: My Work vs. Per-Org Home — what's the difference?

**Question:** The user has two views: the unified My Work at `/` and the per-org Home at `/:orgSlug`. What makes them different?

**Resolution:**

| View | Route | Shows | Org Badges |
|------|-------|-------|------------|
| My Work | `/` | Tasks from ALL orgs in one Kanban | Yes — each card shows its org badge |
| Per-org Home | `/:orgSlug` | Tasks from selected org only | No — redundant since all tasks belong to this org |

**Both use the same Kanban layout** with status columns (To Do, In Progress, Done). The only difference is the data scope and whether org badges are shown.

**Organizing principle for My Work:** By status (Kanban columns). This is the default for L1. The component is designed with a grouping-mode parameter so "by org" and "by urgency" can be added later.

---

### Decision 3: How does the org switcher work?

**Question:** The user needs to switch between organizations. What's the UX?

**Resolution:** Topbar dropdown, left side, adjacent to sidebar navigation.

**Behavior:**
- Shows all orgs the user belongs to (from WorkOS).
- Active org is highlighted.
- Clicking an org navigates to `/:orgSlug` for that org.
- Bottom of dropdown: "Add Organization" button (triggers WorkOS org join flow).
- Switching orgs changes the view but does NOT automatically stop a clock-in session. If clocked into Acme Corp and switching to view FreelanceCo, the Acme session keeps running.

**Data source:** WorkOS Organizations API. Cached on the client side with periodic refresh.

---

### Decision 4: Clock-in/out — explicit or implicit?

**Question:** Should clock-in be implicit (selecting an org = auto clock-in) or explicit (a separate start/stop button)?

**Resolution:** Explicit. A separate "Start Working" / "Stop" button. Model B from the grilling session.

**Button location:** Right side of the topbar, replacing the old `TimeTracker.svelte` slot.

**Rationale:**
- "Viewing Acme Corp tasks" ≠ "I am working for Acme Corp right now." These are different intentions.
- Explicit start/stop makes intent unambiguous.
- Prevents accidental clock-in when just browsing another org's tasks.

**Rejected alternative:** Implicit clock-in on org selection. Too ambiguous. User switches to FreelanceCo to check a deadline — should that start a session? Probably not.

---

### Decision 5: Can the user have multiple live sessions?

**Question:** If clocked into Acme Corp and the user clicks "Start Working" for FreelanceCo too, what happens?

**Resolution:** Both sessions run simultaneously. Both are displayed in the topbar.

**Display:** The topbar shows multiple session pills, each with org name, elapsed time, and a Stop button.

**Rationale:** This reflects reality. An engineer might handle a freelance emergency during work hours. The system should record both, not force an artificial either/or.

**Edge case:** If the user has 5+ live sessions, the topbar shows "3 active sessions" with a collapsed dropdown. Practical display limit.

---

### Decision 6: What if the user never clocks out?

**Question:** Clocked in at 9 AM. Works all day. Goes home without clicking Stop. Next morning, what happens?

**Resolution:** Retroactive close prompt on next login (from L0 specification). No change in L1 behavior — this was resolved in L0. L1 implements the UI for the prompt.

**Prompt content:**
- "You still had a running session for Acme Corp from yesterday (May 14, 9:15 AM). Close it?"
- Options: "Close now" (end time = now), "Set end time" (user picks), "Ignore" (session stays live).
- If closed, auto-enrichment fires.

---

### Decision 7: QuickAdd — which org does the task go to?

**Question:** The user types a task in the QuickAdd input on the My Work page. Which org's inbox project does it target?

**Resolution (Option C from grilling):**

| User State | QuickAdd Target |
|------------|-----------------|
| Clocked into one org | That org's inbox project |
| Clocked into multiple orgs | Prompts: "Which org?" |
| Not clocked in | Prompts: "Which org?" |
| On a per-org Home page | That org (regardless of clock-in state) |

**Rationale:** Clock-in context is the best proxy for "what am I working on right now." If no context exists, ask. Don't guess.

---

### Decision 8: What happens when you complete a task from a different org than your active clock-in?

**Question:** Engineer is clocked into Acme Corp. On the My Work page (which shows all orgs), they drag a FreelanceCo task to Done. What happens?

**Resolution:** Prompt with three options (Option A + auto-create from grilling):

**Prompt content:**
- "This task belongs to FreelanceCo, but you're currently clocked into Acme Corp."
- **Option 1:** "Auto-create session for FreelanceCo" — backdates a minimal org_sessions row (startTime = task.startedAt, endTime = task.completedAt, flagged as auto-created). Task is credited to FreelanceCo.
- **Option 2:** "Switch to FreelanceCo" — stops the Acme session, starts a FreelanceCo session, completes the task normally.
- **Option 3:** "Cancel" — doesn't complete the task.

**Default selection:** Option 1 (fastest path).

---

## User Stories (L1 Scope)

### Engineer Stories — Multi-Org

| ID | Story | Acceptance |
|----|-------|------------|
| MO-01 | As an engineer, I want to switch between organizations so I can manage work across my day job, freelance, and personal projects. | Org switcher visible. Click org → view changes. |
| MO-02 | As an engineer, I want a unified "My Work" view showing tasks from all orgs so I see everything I need to do in one place. | `/` shows Kanban with tasks from all orgs, each with org badge. |
| MO-03 | As an engineer, I want to clock in and out per organization so my time is tracked accurately without per-task timer overhead. | Start/Stop button. Elapsed time visible. |
| MO-04 | As an engineer, I want to complete tasks from any org even when clocked into a different org so cross-org work isn't blocked. | Prompt with auto-create option appears. Task completes successfully. |
| MO-05 | As an engineer, I want to quickly add tasks that auto-target the org I'm currently working for so task creation is fast. | QuickAdd targets clocked-in org. If not clocked in, prompts. |
| MO-06 | As an engineer, I want to see per-org Home pages so I can focus on one work identity without distraction. | `/:orgSlug` shows only that org's tasks. |
| MO-07 | As an engineer, I want to recover from a forgotten clock-out so my time data isn't lost. | Next login prompts retroactive close. |
| MO-08 | As an engineer, I want to see multiple live sessions in the topbar so I know which orgs I'm tracking time for. | Multiple session pills visible simultaneously. |

---

## User Journey: Engineer's First Day with L1

**Morning (8:30 AM) — Setup:**
1. Opens Saha. Sees My Work page at `/`.
2. My Work is empty (no tasks created yet, no org sessions running).
3. Clicks org switcher → sees "Acme Corp" and "FreelanceCo" (from WorkOS).
4. Selects "Acme Corp." View changes to `/:acme-corp` (per-org Home).
5. Clicks "Start Working" next to Acme Corp. Session starts. Topbar shows "Acme Corp — 0h 00m."

**Mid-morning (9:00 AM) — Task Creation:**
6. Presses `/` → QuickAdd focuses.
7. Types: "Fix login bug p1 today sp:3" → NLP parses → creates task in Acme's inbox project.
8. Task appears in To Do column on per-org Home.
9. Drags task to In Progress. Task auto-records `startedAt`.

**Afternoon (2:00 PM) — Cross-Org Work:**
10. Navigates to `/` (My Work) to see full picture.
11. Sees Acme task in In Progress + FreelanceCo task in To Do.
12. Drags FreelanceCo task to Done. Prompt appears: "This task belongs to FreelanceCo, but you're clocked into Acme Corp."
13. Selects "Auto-create session for FreelanceCo." Task completes. Minimal org_session created for FreelanceCo.
14. Acme session keeps running.

**Evening (5:30 PM) — Clock-Out:**
15. Clicks "Stop" on the Acme Corp session pill.
16. Auto-enrichment fires: session records "3 tasks, 11 SP" for today's Acme work.
17. Closes laptop.

**Next Morning (9:00 AM) — Retroactive Close:**
18. Opens Saha. Prompt: "You still had a running session for FreelanceCo from yesterday. Close it?"
19. Clicks "Close now." Session ends. FreelanceCo data is sealed.

---

## Features Delivered

| Feature | Description | Route |
|---------|-------------|-------|
| **My Work** | Unified Kanban across all orgs. Org badges on cards. | `/` |
| **Per-org Home** | Scoped Kanban for a single org. | `/:orgSlug` |
| **Org Switcher** | Dropdown listing all user's orgs. Click to navigate. | Topbar (left) |
| **Clock-in/out** | Explicit start/stop per org. Overlapping sessions. | Topbar (right) |
| **QuickAdd targeting** | Auto-targets clocked-in org. Prompts if ambiguous. | My Work + per-org Home |
| **Cross-org completion** | Prompt with auto-create session option. | My Work |
| **Retroactive close** | Prompt on login for forgotten clock-outs. | On login |
| **Route structure** | Org-prefixed URLs. All old routes removed. | All routes |

---

## Routes Created/Affected

| Route | Purpose | Old Equivalent | Status |
|-------|---------|----------------|--------|
| `/` | My Work (unified) | (new) | L1 built |
| `/:orgSlug` | Per-org Home | `/home` (removed) | L1 built |
| `/:orgSlug/projects` | Org projects | `/projects` (removed) | L1 built |
| `/:orgSlug/project/:id/kanban` | Project Kanban | `/project/:id/kanban` (migrated) | L1 built |
| `/:orgSlug/project/:id/sprints` | Sprint board | `/project/:id/sprints` (migrated) | L1 built |

---

## What Gets Removed

| Old Component/Route | Why |
|---------------------|-----|
| `TimeTracker.svelte` | Replaced by org clock-in/out button |
| `TimeEntryForm.svelte` | No more manual time entry. Auto-capture replaces it. |
| `/home` route | Split into `/` (My Work) and `/:orgSlug` (per-org Home) |
| `/projects` route | Moved to `/:orgSlug/projects` |
| `/velocity` route | Moved to `/:orgSlug/velocity` |
| Old workspace-scoped routes | All become org-prefixed |

---

## Edge Cases Catalog

| Edge Case | Resolution |
|-----------|------------|
| User has no orgs (personal workspace only) | My Work shows personal tasks only. Clock-in targets personal work. |
| User is removed from an org mid-session | Session is auto-closed. Task data up to that point is preserved. |
| QuickAdd with no active org and no clock-in | Prompts "Which org is this for?" |
| User starts 5+ simultaneous sessions | Topbar collapses to "3 active" + dropdown |
| Org slug collision (two orgs with same name) | Slugs are unique. WorkOS provides distinct slugs. |
| Network failure during clock-out | Session stays live. User can retry or retroactively close later. |
| Clock-in for an org with `requireClockIn = true` | All org features work. If setting is true, status changes block until clocked in (L2 behavior). |
| Browser close with live sessions | Sessions remain live in database. Detected on next login. |
