# Saha — Master Implementation Plan

**Version:** 1.0  
**Date:** May 15, 2026  
**Status:** Approved by Product Owner  
**Target Market:** Small to medium companies (3–50 employees)  
**Business Model:** Bottoms-up adoption — individual employee adopts → company pays

---

## Strategic Vision

Saha is a project management tool for people who operate across multiple work identities. One account, multiple Organizations, personal trackable work — with Kanban, sprints, velocity, and capacity planning.

**Unique Value Proposition:** Multi-organization switching with unified views. An engineer can see their day job tasks, freelance deadlines, and personal side project todos in ONE place with ONE timer.

**Acquisition Funnel:** Individual engineer adopts Saha for personal multi-org management → loves it → brings it into their company → company pays for org-level features (team management, HR tools, reporting).

**Execution Strategy:** Foundation-first. Organization layer built before PM features sit on top. Parallel streams where features don't depend on Foundation.

---

## Level Overview

| Level | Theme | What Gets Built | Primary Beneficiary |
|-------|-------|-----------------|---------------------|
| **L0** | Foundation | Schema, migrations, org architecture. Nothing user-visible. | Infrastructure |
| **L1** | Multi-Org Core | Org switching, unified views, org clock-in/out. The unique proposition ships. | Engineer |
| **L2** | Task & Sprint Flow | Sprint creation/completion, task auto-capture, sprint flags. PM workflows complete. | PM |
| **L3** | Visibility & Intelligence | Timesheet, velocity charts, estimation accuracy, personal velocity. | PM, Executive |
| **L4** | Collaboration & Polish | @mentions, markdown, keyboard shortcuts, accessibility, error handling. | Everyone |
| **L5** | HR & Executive | Org dashboard, employee directory, HR visibility. Company pays version. | HR, Executive |

---

## Key Architectural Decisions

| Decision | Resolution |
|----------|-----------|
| Business model | Bottoms-up: individual employee adopts → company pays |
| Unique proposition | Multi-organization switching with unified views |
| Execution strategy | Foundation-first (organization layer before PM features sit on top) |
| Org ownership | WorkOS owns org identity; Saha stores only `organization_settings` |
| Navigation | Per-org Home + unified "My Work" (Slack model) |
| Route structure | Org-prefixed: `/:orgSlug`, `/:orgSlug/projects`, etc. `/` = My Work |
| Time model | Org-level clock-in/out replaces task-level timer |
| Time schema | `org_sessions` table auto-enriched with task completion summary |
| Legacy time table | `timeEntries` dropped, replaced by `org_sessions` + task auto-capture |
| Sprint accuracy | tasks completed ÷ org session time |
| Status model | `todo → in_progress → done` (review removed for now) |
| Export | Deferred to future level |

---

## Files in This Plan

| File | Content |
|------|---------|
| `PLAN-MASTER.md` | This file — overview, key decisions, level summary |
| `PLAN-L0-FOUNDATION.md` | Schema, migrations, org architecture |
| `PLAN-L1-MULTI-ORG.md` | Org switching, unified views, clock-in/out |
| `PLAN-L2-TASK-SPRINT.md` | Sprint lifecycle, task auto-capture, flags |
| `PLAN-L3-VISIBILITY.md` | Timesheet, velocity charts, estimation accuracy |
| `PLAN-L4-COLLABORATION.md` | @mentions, markdown, accessibility, error handling |
| `PLAN-L5-HR-EXECUTIVE.md` | Org dashboard, employee directory, HR visibility |

---

## Glossary (from CONTEXT.md)

| Term | Definition |
|------|------------|
| **Organization** | A real-world employer or business entity. Authenticated via WorkOS. Contains Workspaces. |
| **Workspace** | A container for projects within an Organization. |
| **Project** | A deliverable or workstream within a Workspace. Contains tasks, sprints. |
| **Sprint** | A time-boxed period for completing work within a Project. |
| **Task** | The fundamental unit of work. Lives in a Project. |
| **Sprint Flag** | Label on a task explaining why it was added mid-sprint. Values: `unscheduled`, `pulled_forward`, `emergency`, `reopened`. |
| **Velocity** | Story points completed within a date window, regardless of which Sprint owns the task. |
| **Capacity** | Hours an employee can work in a given Sprint. Set by PM per Sprint per person. |
| **Deadline** | Hard cutoff date after which a task is overdue. |
| **Due Date** | Target completion date. |
| **org_sessions** | New table replacing timeEntries. Tracks org-level clock-in/out sessions. |
| **organization_settings** | Saha-specific org configuration (sprint length, working hours, timezone, etc.). |

---

## Dependencies Between Levels

```
L0 (Foundation)
  ↓
L1 (Multi-Org Core) ─────────────────────────────────────┐
  ↓                                                       │
L2 (Task & Sprint Flow) ──────────────────────────────────┤
  ↓                                                       │
L3 (Visibility & Intelligence) ───────────────────────────┤
  ↓                                                       │
L4 (Collaboration & Polish) ──────────────────────────────┤
  ↓                                                       │
L5 (HR & Executive) ←─────────────────────────────────────┘
```

Each level builds on the previous. No level can ship without its predecessors complete.

---

## Success Criteria by Level

| Level | Success Metric |
|-------|----------------|
| L0 | All migrations applied. No runtime errors. Existing workspace data backfilled. |
| L1 | Engineer can switch orgs, clock in/out per org, see unified task board. |
| L2 | PM can create and complete sprints. Sprint estimation accuracy auto-computed. |
| L3 | PM sees velocity trends. Engineer sees personal velocity. Timesheet renders. |
| L4 | @mentions work. Keyboard shortcuts functional. Error toasts appear. |
| L5 | Executive sees org health in 30 seconds. HR sees employee directory. |
