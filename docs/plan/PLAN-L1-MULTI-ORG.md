# Saha — Level 1: Multi-Org Core

**Version:** 1.0  
**Date:** May 15, 2026  
**Status:** Approved  
**Theme:** Org switching, unified views, org clock-in/out. The unique proposition ships.

---

## Objective

Ship the core multi-organization experience that differentiates Saha from Linear/Asana. An engineer can switch between work identities, clock in/out per org, and see all their tasks in one unified view. This is the acquisition hook — the feature that makes individual users adopt Saha and bring it into their company.

---

## Route Structure

All routes are org-prefixed except the unified My Work page.

```
/                              → My Work (unified, all orgs)
/:orgSlug                      → Per-org Home
/:orgSlug/projects             → Org projects list
/:orgSlug/project/:id/kanban   → Project Kanban
/:orgSlug/project/:id/sprints  → Sprint board
/:orgSlug/project/:id/sprints/backlog → Backlog
/:orgSlug/velocity             → Org velocity page
```

**Removed Routes:**
- `/home` → replaced by `/` (My Work)
- `/projects` → replaced by `/:orgSlug/projects`
- `/velocity` → replaced by `/:orgSlug/velocity`

---

## Components

### 1. Org Switcher

**Location:** Top bar, left side (adjacent to navigation)

**Behavior:**
- Dropdown showing all orgs the user belongs to
- Click org → navigate to `/:orgSlug`
- Active org highlighted
- "Add Organization" option at bottom (triggers WorkOS org join flow)

**Data Source:** WorkOS Organizations API

```typescript
interface Organization {
  id: string        // WorkOS org ID
  name: string      // Display name
  slug: string      // URL-friendly
  logoUrl?: string  // Optional
}
```

**Component Structure:**

```svelte
<!-- /packages/web/src/lib/components/OrgSwitcher.svelte -->
<script lang="ts">
  import { activeOrg, setActiveOrg } from '$lib/stores/active-org.svelte'
  import { goto } from '$app/navigation'
  
  let orgs: Organization[] = []
  let isOpen = $state(false)
  
  async function loadOrgs() {
    // Fetch from WorkOS API
    orgs = await fetch('/api/workos/organizations').then(r => r.json())
  }
  
  function selectOrg(org: Organization) {
    setActiveOrg(org)
    goto(`/${org.slug}`)
    isOpen = false
  }
</script>

<div class="org-switcher">
  <button on:click={() => isOpen = !isOpen}>
    {#if $activeOrg}
      <span>{$activeOrg.name}</span>
    {:else}
      <span>Select Organization</span>
    {/if}
  </button>
  
  {#if isOpen}
    <div class="dropdown">
      {#each orgs as org}
        <button on:click={() => selectOrg(org)} class:active={org.id === $activeOrg?.id}>
          {org.name}
        </button>
      {/each}
      <button on:click={() => goto('/api/workos/join')}>
        + Add Organization
      </button>
    </div>
  {/if}
</div>
```

---

### 2. My Work (Unified View)

**Route:** `/`

**Purpose:** The engineer's daily home page. Shows all tasks across all orgs in a single Kanban board.

**Organizing Principle:** By status (Kanban columns: To Do, In Progress, Done). Organized for future expansion to "by org" or "by urgency" grouping modes.

**Data Source:** `GET /tasks/home` endpoint with all orgs' workspaces included.

**Task Cards:** Display org badge + project name for context.

```svelte
<!-- /packages/web/src/routes/+page.svelte -->
<script lang="ts">
  import KanbanBoard from '$lib/components/KanbanBoard.svelte'
  import QuickAddInput from '$lib/components/QuickAddInput.svelte'
  
  // Fetch tasks from all orgs
  let tasks = $state<Task[]>([])
  let groupingMode = $state<'status' | 'org' | 'urgency'>('status')
  
  // Grouping logic (prepared for future expansion)
  function groupTasks(tasks: Task[], mode: string) {
    if (mode === 'status') {
      return {
        'todo': tasks.filter(t => t.status === 'todo'),
        'in_progress': tasks.filter(t => t.status === 'in_progress'),
        'done': tasks.filter(t => t.status === 'done'),
      }
    }
    // Future: org grouping, urgency grouping
  }
</script>

<div class="my-work-page">
  <header>
    <h1>My Work</h1>
    <QuickAddInput />
  </header>
  
  <KanbanBoard
    tasks={tasks}
    groupingMode={groupingMode}
    showOrgBadge={true}
  />
</div>
```

**Task Card Org Badge:**

```svelte
<!-- /packages/web/src/lib/components/TaskCard.svelte -->
<div class="task-card">
  <div class="org-badge" style="background: {task.org.color}">
    {task.org.name}
  </div>
  <div class="project-label">{task.project.name}</div>
  <div class="title">{task.title}</div>
  <!-- Priority, due date, etc. -->
</div>
```

---

### 3. Per-Org Home

**Route:** `/:orgSlug`

**Purpose:** Org-scoped version of My Work. Shows only tasks from the selected org. Same Kanban layout, filtered to one org.

**Data Source:** `GET /tasks/home` with workspace filter for the active org.

**Behavior:**
- Identical layout to My Work
- Tasks filtered to active org only
- No org badges on cards (redundant — all tasks belong to this org)
- QuickAdd targets active org's inbox project by default

```svelte
<!-- /packages/web/src/routes/[orgSlug]/+page.svelte -->
<script lang="ts">
  import KanbanBoard from '$lib/components/KanbanBoard.svelte'
  import QuickAddInput from '$lib/components/QuickAddInput.svelte'
  
  export let data
  
  let tasks = $state<Task[]>([])
  let org = $state<Organization>(data.org)
</script>

<div class="org-home-page">
  <header>
    <h1>{org.name}</h1>
    <QuickAddInput targetOrg={org} />
  </header>
  
  <KanbanBoard
    tasks={tasks}
    groupingMode="status"
    showOrgBadge={false}
  />
</div>
```

---

### 4. Clock-In/Clock-Out Button

**Location:** Top bar, right side (replaces old `TimeTracker.svelte` position)

**Model:** Explicit start/stop. Separate from org switcher.

**Behavior:**
- **Default state:** "Start Working" button
- **Active session:** Shows elapsed time + org name + "Stop" button
- **Multiple sessions:** Can show multiple live clocks if overlapping sessions exist
- **Retroactive close:** If user forgot to clock out, next login prompts "You still had a running session — close it?"

**Component Structure:**

```svelte
<!-- /packages/web/src/lib/components/OrgClock.svelte -->
<script lang="ts">
  import { activeOrg } from '$lib/stores/active-org.svelte'
  
  let sessions = $state<OrgSession[]>([])
  let elapsed = $state<Map<string, number>>(new Map())
  
  async function startSession() {
    if (!$activeOrg) {
      // Prompt user to select org first
      return
    }
    const session = await trpc.orgSession.create.mutate({
      organizationId: $activeOrg.id,
      startTime: new Date(),
    })
    sessions.push(session)
    startTimer(session.id)
  }
  
  async function stopSession(sessionId: string) {
    await trpc.orgSession.stop.mutate({ id: sessionId })
    sessions = sessions.filter(s => s.id !== sessionId)
  }
  
  function startTimer(sessionId: string) {
    const interval = setInterval(() => {
      const session = sessions.find(s => s.id === sessionId)
      if (session) {
        elapsed.set(sessionId, Math.floor((Date.now() - session.startTime.getTime()) / 1000))
      }
    }, 1000)
    return () => clearInterval(interval)
  }
</script>

<div class="org-clock">
  {#each sessions as session}
    <div class="session-pill">
      <span class="org-name">{session.organizationName}</span>
      <span class="elapsed">{formatTime(elapsed.get(session.id) || 0)}</span>
      <button on:click={() => stopSession(session.id)}>Stop</button>
    </div>
  {/each}
  
  <button class="start-button" on:click={startSession}>
    Start Working
  </button>
</div>
```

**Session Pill Styling:**

```css
.session-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: var(--bg-session-active);
  border-radius: 20px;
  font-size: 13px;
}

.session-pill .org-name {
  font-weight: 500;
}

.session-pill .elapsed {
  font-family: monospace;
  color: var(--text-muted);
}
```

---

### 5. QuickAdd Org Targeting

**Behavior:**
- If user is clocked into an org → QuickAdd targets that org's inbox project
- If user is not clocked in → prompts "Which org is this task for?" before creating
- If user is on a per-org Home page → QuickAdd defaults to that org regardless of clock-in state

**Implementation:**

```typescript
// /packages/web/src/lib/components/QuickAddInput.svelte
async function handleSubmit(input: string) {
  let targetOrg = activeOrg
  
  if (!targetOrg) {
    // Prompt user to select org
    targetOrg = await showOrgSelector()
  }
  
  // Parse NLP input
  const parsed = await trpc.task.parse.query({ input })
  
  // Create task in target org's inbox project
  const task = await trpc.task.create.mutate({
    ...parsed,
    projectId: targetOrg.inboxProjectId,
  })
  
  return task
}
```

---

## Data Flow

### Clock-In Flow

```
User clicks "Start Working"
  → POST /org-sessions/create { organizationId, startTime }
  → Session created with end_time = NULL
  → Timer starts in topbar
  → Session persists across page navigation
```

### Clock-Out Flow

```
User clicks "Stop"
  → POST /org-sessions/stop { id, endTime }
  → Auto-enrichment triggered:
     - tasks_completed = COUNT tasks completed during session
     - story_points_completed = SUM storyPoints
     - estimated_hours_sum = SUM estimatedHours
  → Session row updated
  → Timer stops in topbar
```

### Retroactive Close Flow

```
User logs in with live session from previous day
  → GET /org-sessions/running
  → Prompt: "You still had a running session for [Org] — close it?"
  → User clicks "Close" → same as clock-out flow
  → User clicks "Ignore" → session stays live
```

### Cross-Org Task Completion Flow

```
User is clocked into Org B, drags Org A task to "done"
  → Prompt: "This task belongs to [Org A], but you're clocked into [Org B]."
  → Options:
     1. "Auto-create session for [Org A]" → backdated minimal session, credits task
     2. "Switch to [Org A]" → stops Org B session, starts Org A session, completes task
     3. "Cancel" → doesn't complete task
```

---

## API Endpoints

### Org Sessions

```
POST   /api/trpc/orgSession.create    → Create new session
POST   /api/trpc/orgSession.stop      → Stop session (with auto-enrichment)
GET    /api/trpc/orgSession.running   → Get user's live sessions
GET    /api/trpc/orgSession.list      → Get user's sessions (with filters)
```

### Tasks (Modified)

```
GET    /api/trpc/task.home            → Now accepts org filter
POST   /api/trpc/task.create          → Now requires org context
```

---

## State Management

### Stores

```typescript
// /packages/web/src/lib/stores/active-org.svelte.ts
export const activeOrg = writable<Organization | null>(null)

// /packages/web/src/lib/stores/org-sessions.svelte.ts
export const orgSessions = writable<OrgSession[]>([])

// /packages/web/src/lib/stores/tasks.svelte.ts
export const tasks = writable<Task[]>([])
```

### Persistence

- Active org stored in localStorage
- Live sessions stored in database (survives page refresh)
- QuickAdd last-used org stored in localStorage

---

## Testing Requirements

### Unit Tests

- [ ] Org switcher renders org list correctly
- [ ] My Work groups tasks by status
- [ ] Per-org Home filters tasks correctly
- [ ] Clock-in creates session with correct data
- [ ] Clock-out triggers auto-enrichment
- [ ] Retroactive close prompt appears on login
- [ ] Cross-org completion prompt shows correct options

### Integration Tests

- [ ] Org-prefixed routes resolve correctly
- [ ] QuickAdd targets correct org based on clock-in state
- [ ] Multiple overlapping sessions display correctly
- [ ] Session persists across page navigation
- [ ] Auto-enrichment computes correct values

### E2E Tests

- [ ] User can switch orgs and see different task sets
- [ ] User can clock in/out and see elapsed time
- [ ] User can complete tasks and see them in timesheet
- [ ] User with forgotten session sees retroactive close prompt

---

## Dependencies

- L0 (Foundation) must be complete
- WorkOS Organizations API accessible
- Active-org store implemented
- Org-scoped middleware active

---

## Deliverables

1. ✅ Org-prefixed route structure
2. ✅ My Work page (`/`) with unified Kanban
3. ✅ Per-org Home page (`/:orgSlug`) with scoped Kanban
4. ✅ Org switcher component
5. ✅ Org clock-in/clock-out component
6. ✅ QuickAdd org targeting logic
7. ✅ Cross-org task completion prompt
8. ✅ Retroactive session close flow
9. ✅ Old `TimeTracker.svelte` removed
10. ✅ Old `/home` route removed

---

## Next Level

L1 is the user-facing multi-org experience. L2 (Task & Sprint Flow) builds on this by completing the PM workflows: sprint creation, sprint completion, task auto-capture, and sprint flags.
