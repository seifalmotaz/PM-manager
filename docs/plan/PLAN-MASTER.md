# Saha — Implementation Plan: Master Overview

**Version:** 2.0  
**Date:** May 15, 2026  
**Status:** Approved by Product Owner  
**Type:** Product Requirements & Specification

---

## Strategic Context

### What Saha Solves

A project management tool for people who operate across multiple work identities. One account, multiple Organizations, personal trackable work — with Kanban, sprints, velocity, and capacity planning.

**Current State Problem:** The app has 197 identified issues across 11 audit areas. 46 critical issues. User story coverage ranges from 14% (HR) to 59% (PM). The app is functional for basic task management but incomplete for all target personas.

### Business Model

Bottoms-up SaaS adoption:
1. Individual employee adopts Saha for personal multi-org management
2. Employee loves it → brings it into their company
3. Company pays for org-level features

**Target Market:** Small to medium companies (3–50 employees) that need lightweight tracking without rigid management hierarchy.

### Unique Value Proposition

Multi-organization switching with unified views. An engineer can see their day job tasks, freelance deadlines, and personal side project todos in ONE place with ONE clock-in system. No competitor (Linear, Asana, Height, Jira) handles multi-org work identities well.

---

## Execution Strategy

### Foundation-First

The Organization layer is built before PM features sit on top. This was a deliberate trade-off:

- **Decision point:** Build Organization layer immediately (as architectural foundation) vs. ship PM features first (faster time-to-value)
- **Resolution:** Foundation-first. Every subsequent feature is org-aware from day one.
- **Rationale:** The app is not in production. Speed of learning matters more than speed of delivery. Adding org-scoping retroactively would require touching every query, every route, every component — it's cheaper to do it once, right.

### WorkOS as Org Authority

WorkOS owns organization identity, membership, and authentication. Saha does NOT build its own organizations table. Saha stores only `organization_settings` — configuration that WorkOS cannot store.

- **Decision point:** Full org membership tables vs. lean WorkOS integration
- **Resolution:** WorkOS is source of truth. Saha stores only its own settings.
- **New table needed:** `organization_settings` keyed to WorkOS organization IDs
- **Settings stored:** default sprint length, working hours, working days, timezone, whether clock-in is mandatory

### Multi-Org Navigation (Slack Model)

- **Per-org Home:** Each organization has its own scoped view at `/:orgSlug`
- **My Work:** Unified cross-org view at `/` (the root route)
- **Org switching:** Slack-style dropdown in the top bar
- **Route structure:** All routes are org-prefixed (`/:orgSlug/projects`, `/:orgSlug/velocity`, etc.)
- **Decision point:** Org-in-URL vs. org-in-store
- **Resolution:** Org-in-URL. Enables deep linking to specific org pages. Matches Slack model.

---

## Level Structure

| Level | Theme | What Changes | Who Benefits |
|-------|-------|-------------|--------------|
| **L0** | Foundation | Schema and architecture. Nothing user-visible. | Infrastructure |
| **L1** | Multi-Org Core | Org switching, unified views, org clock-in/out. The unique proposition ships. | Engineer |
| **L2** | Task & Sprint Flow | Sprint creation/completion, task auto-capture, sprint flags. | PM |
| **L3** | Visibility & Intelligence | Timesheet, velocity charts, estimation accuracy, personal velocity. | PM, Executive |
| **L4** | Collaboration & Polish | @mentions, markdown, keyboard shortcuts, accessibility, error handling. | Everyone |
| **L5** | HR & Executive | Org dashboard, employee directory, HR visibility. | HR, Executive |

### Dependency Chain

```
L0 → L1 → L2 → L3 → L4 → L5
```

Each level builds on all previous levels. No level can ship without its predecessors complete.

---

## Key Domain Decisions (Cross-Cutting)

These decisions affect multiple levels:

| Decision | Resolution | Grilled In |
|----------|-----------|------------|
| Org ownership model | WorkOS owns identity + membership. Saha owns settings. | L0 |
| Time tracking model | Org-level clock-in/out. Task-level timer is eliminated. | L0, L1 |
| Timer data model | `timeEntries` table dropped. Replaced by `org_sessions` with auto-enrichment. | L0 |
| Status model | `todo → in_progress → done`. Review removed for now. | L2 |
| Sprint completion behavior | Locks sprint, freezes org_sessions, velocity snapshot, move unfinished tasks. | L2 |
| Sprint estimation formula | Tasks completed story points ÷ org session hours | L2, L3 |
| Export capability | Deferred to future level | L4 |
| Route structure | Org-prefixed URLs, `/` = My Work | L1 |

---

## What Happened to the Old Stuff

| Old Feature | What Replaces It |
|-------------|-----------------|
| `timeEntries` table | `org_sessions` with auto-enrichment |
| `TimeTracker.svelte` | Org clock-in/out button in topbar |
| `TimeEntryForm.svelte` | Auto-capture on task completion. No manual form. |
| `review` status | Removed. Status model becomes 3 states. |
| Per-task timer | Eliminated. All time data derived from org sessions + task timestamps. |
| `/home` route | `/` (My Work, unified) and `/:orgSlug` (per-org Home) |
| `/projects` route | `/:orgSlug/projects` |
| `/velocity` route | `/:orgSlug/velocity` |
| Settings button in sidebar | Replaced by `/:orgSlug/settings` (future) |

---

## Success Criteria by Level

| Level | Success Metric |
|-------|----------------|
| L0 | All migrations applied. Existing data intact. No runtime errors. |
| L1 | Engineer can switch orgs, clock in/out per org, see unified task board. |
| L2 | PM can create and complete sprints. Sprint completion auto-freezes sessions. |
| L3 | PM sees velocity bar chart. Engineer sees personal velocity. Timesheet renders weekly totals. |
| L4 | @mentions with autocomplete work. Markdown preview toggles. Toasts appear on errors. |
| L5 | Executive sees org health in 30 seconds. HR sees employee directory with search. |

---

## Files in This Plan

| File | Description |
|------|-------------|
| `PLAN-MASTER.md` | This file — strategic overview, cross-cutting decisions, level structure |
| `PLAN-L0-FOUNDATION.md` | Database architecture, WorkOS integration, migration strategy |
| `PLAN-L1-MULTI-ORG.md` | Org switching, unified My Work, per-org Home, clock-in/out |
| `PLAN-L2-TASK-SPRINT.md` | Sprint lifecycle, task auto-capture, sprint flags |
| `PLAN-L3-VISIBILITY.md` | Timesheet, velocity charts, estimation accuracy |
| `PLAN-L4-COLLABORATION.md` | @mentions, markdown, accessibility, error handling |
| `PLAN-L5-HR-EXECUTIVE.md` | Org dashboard, employee directory |
