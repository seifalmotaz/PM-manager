# Spec: Saha UI/UX Upgrade (The Slate Redesign)

**Date**: 2026-05-12
**Status**: Draft
**Owner**: Gemini CLI / Seif Al Motaz

---

## 1. Vision & Strategy

The goal is to transform Saha into an enterprise-grade project management tool that feels as fast and personal as Todoist but as robust as Jira. We are moving away from a "simple web app" feel to a "pro-grade workspace" (The Manager's Cockpit).

### Core Pillars
- **Speed**: Every interaction under 50ms (Optimistic UI).
- **Density**: "The Manager's Cockpit" layout for maximum visibility.
- **Privacy**: Maintaining the mandate of hiding sensitive names in global views (sidebar).
- **Aesthetic**: "The Slate" — a high-contrast, modern, reliable look inspired by Linear.

---

## 2. Information Architecture & Layout

### 2.1 The Three-Pane Cockpit
We are transitioning from a 2-column grid to a robust 3-pane architecture:

1.  **Sidebar (Nav Pane)**:
    - Width: 240px (expanded) / 64px (collapsed).
    - Content: Global navigation (Home, Inbox, Projects, Sprints, Velocity, Capacity, Docs).
    - Privacy: Collapsed by default; names are hidden until explicit expansion or hover.
2.  **Main View (Content Pane)**:
    - Fluid width.
    - Content: Kanban boards, task lists, sprint views.
    - Header: Clear Project/Workspace breadcrumbs with fast-switcher.
3.  **Detail Panel (Action Pane)**:
    - Width: 400px.
    - Content: Task details, project settings, doc editing.
    - Interaction: Slides in from the right. Replaces full-screen modals for better context retention.

### 2.2 Navigation System
- **CMD+K Switcher**: A global palette for jumping between Workspaces and Organizations instantly.
- **Top Bar**: Minimal. Contains the Universal Search/Command input, Global Timer, and Profile.

---

## 3. Interaction Design (Speed UX)

### 3.1 Universal Command Palette (CMD+K)
The central engine for all actions.
- **Search**: Fuzzy search across tasks, projects, and files.
- **Create**: NLP parsing (e.g., `Fix bug p0 tomorrow @ahmed`) for instant task creation.
- **Navigate**: Switch views (e.g., `/velocity`, `/home`).
- **Execute**: Run workspace actions (e.g., `> New Sprint`).

### 3.2 Optimistic UI & Reactivity
- **Svelte 5 Runes**: Leveraging `$state` and `$derived` for surgical DOM updates.
- **Instant Actions**: Drag-and-drop, status changes, and priority updates reflect immediately.
- **Skeleton Loading**: High-fidelity skeletons for initial data fetches to eliminate "pop-in".

### 3.3 Keyboard Mastery
- `1-5`: Quick navigation between sidebar items.
- `J/K`: Navigate task list.
- `Enter`: Open detail panel.
- `Q`: Quick-add task.
- `CMD+Enter`: Save and close details.

---

## 4. Visual Design (The Slate)

### 4.1 Theme & Palette
- **Primary Scale**: `zinc` (neutral, solid) and `slate` (cool, professional).
- **Backgrounds**: `zinc-950` (Dark Mode) / `zinc-50` (Light Mode).
- **Borders**: 1px solid `zinc-800` / `zinc-200`.
- **Accents**: `indigo-600` for primary actions and active states.

### 4.2 Typography
- **Primary**: Inter (System Sans-Serif).
- **Sizing**: 14px (Base), 12px (Muted/Metadata), 16px+ (Headings).
- **Hierarchy**: Medium weights (500-600) for interactive elements; Regular (400) for content.

### 4.3 Redesigned Components
- **Task Card**:
  - Vertical priority bar on left.
  - Title dominant.
  - Sub-row for metadata (Project icon, Due date, Assignee avatar).
  - Hover reveals quick-actions (Done, Archive, Priority).
- **Kanban Board**:
  - Clean column headers with task counts and "Quick Add" button.
  - Subtle background tint for columns.
  - Drag-and-drop with "Ghost" placement preview.

---

## 5. Implementation Roadmap

1.  **Phase 1: Foundation (CSS & Layout)**
    - Refactor `app.css` to use Zinc/Slate color system.
    - Implement the 3-pane Layout component.
2.  **Phase 2: The Command Palette**
    - Build the CMD+K component with NLP integration.
    - Implement navigation shortcuts.
3.  **Phase 3: Component Overhaul**
    - Redesign `TaskCard`, `KanbanBoard`, and `KanbanColumn`.
    - Implement the `DetailPanel` slide-in.
4.  **Phase 4: Polish & Performance**
    - Add optimistic UI logic to task mutations.
    - Refine transitions and micro-interactions.
