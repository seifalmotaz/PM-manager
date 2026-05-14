<script lang="ts">
  import { trpc } from '$lib/trpc'
  import { selectedTask } from '$lib/stores/tasks'
  import { activeFilterIds } from '$lib/stores/workspaces'
  import { get } from 'svelte/store'
  import { onMount } from 'svelte'
  import { Clock, Square, Search } from 'lucide-svelte'

  let runningEntry = $state<{ id: string; taskId: string; startTime: string; task?: { id: string; title: string } } | null>(null)
  let elapsed = $state(0)
  let intervalId: ReturnType<typeof setInterval> | null = $state(null)
  let isDropdownOpen = $state(false)
  let searchQuery = $state('')
  let recentTasks = $state<Array<{ id: string; title: string; projectName?: string }>>([])
  let isLoadingTasks = $state(false)
  let dropdownEl = $state<HTMLDivElement>()

  $effect(() => {
    async function loadRunning() {
      try {
        const entry = await trpc.timeEntry.running.query()
        if (entry) {
          runningEntry = entry as typeof runningEntry
          const startTime = new Date((entry as any).startTime).getTime()
          elapsed = Math.floor((Date.now() - startTime) / 1000)
          intervalId = setInterval(() => {
            elapsed++
          }, 1000)
        }
      } catch (err) {
        console.error('Failed to load running timer:', err)
      }
    }
    loadRunning()

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  })

  // Close dropdown on outside click
  $effect(() => {
    if (!isDropdownOpen) return

    function handleClickOutside(e: MouseEvent) {
      if (dropdownEl && !dropdownEl.contains(e.target as Node)) {
        isDropdownOpen = false
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  })

  function formatElapsed(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  async function handleStart(taskId: string) {
    try {
      const entry = await trpc.timeEntry.start.mutate({ taskId })
      runningEntry = entry as typeof runningEntry
      elapsed = 0
      intervalId = setInterval(() => {
        elapsed++
      }, 1000)
      isDropdownOpen = false
      searchQuery = ''
    } catch (err) {
      console.error('Failed to start timer:', err)
    }
  }

  async function handleStop() {
    if (!runningEntry) return
    try {
      await trpc.timeEntry.stop.mutate({ id: runningEntry.id })
      if (intervalId) clearInterval(intervalId)
      runningEntry = null
      elapsed = 0
    } catch (err) {
      console.error('Failed to stop timer:', err)
    }
  }

  function handleTaskClick() {
    if (runningEntry?.task) {
      selectedTask.set(runningEntry.task as any)
    }
  }

  async function searchTasks(query: string) {
    if (!query.trim()) {
      recentTasks = []
      return
    }
    isLoadingTasks = true
    try {
      const results = await trpc.task.search.query({ query, workspaceIds: get(activeFilterIds) })
      recentTasks = results.tasks.slice(0, 10).map((t: any) => ({
        id: t.id,
        title: t.title,
        projectName: t.project?.name
      }))
    } catch (err) {
      console.error('Failed to search tasks:', err)
      recentTasks = []
    } finally {
      isLoadingTasks = false
    }
  }

  function handleSearchInput(e: Event) {
    const value = (e.target as HTMLInputElement).value
    searchQuery = value
    searchTasks(value)
  }

  function truncateTitle(title: string, maxLen = 30): string {
    return title.length > maxLen ? title.slice(0, maxLen) + '...' : title
  }
</script>

<div class="time-tracker" bind:this={dropdownEl}>
  {#if runningEntry}
    <!-- Running state -->
    <div class="tracker-running">
      <span class="pulse-dot"></span>
      <button class="task-title-btn" onclick={handleTaskClick} title={runningEntry.task?.title}>
        {truncateTitle(runningEntry.task?.title ?? 'Task')}
      </button>
      <span class="elapsed-time">{formatElapsed(elapsed)}</span>
      <button class="stop-btn" onclick={handleStop} title="Stop timer">
        <Square size={14} />
      </button>
    </div>
  {:else}
    <!-- Idle state -->
    <button 
      class="topbar-action" 
      title="Start Timer"
      onclick={() => isDropdownOpen = !isDropdownOpen}
    >
      <Clock size={20} />
      <span class="timer-label">Start Timer</span>
    </button>

    {#if isDropdownOpen}
      <div class="timer-dropdown">
        <div class="dropdown-search">
          <Search size={16} class="search-icon" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            oninput={handleSearchInput}
          />
        </div>
        <div class="task-list">
          {#if isLoadingTasks}
            <div class="loading-tasks">Searching...</div>
          {:else if recentTasks.length > 0}
            {#each recentTasks as task (task.id)}
              <button 
                class="task-item"
                onclick={() => handleStart(task.id)}
              >
                <span class="task-name">{task.title}</span>
                {#if task.projectName}
                  <span class="task-project">{task.projectName}</span>
                {/if}
              </button>
            {/each}
          {:else if searchQuery}
            <div class="no-tasks">No tasks found</div>
          {:else}
            <div class="no-tasks">Type to search for tasks</div>
          {/if}
        </div>
        <div class="dropdown-footer">
          <button class="manual-link">Log time manually</button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .time-tracker {
    position: relative;
  }

  .tracker-running {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background-color: var(--bg-surface);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-md);
    padding: 0.375rem 0.75rem;
  }

  .pulse-dot {
    width: 8px;
    height: 8px;
    background-color: #22c55e;
    border-radius: 50%;
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }

  .task-title-btn {
    color: var(--text-main);
    font-size: 0.875rem;
    font-weight: 500;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0.125rem 0;
  }

  .task-title-btn:hover {
    text-decoration: underline;
  }

  .elapsed-time {
    font-family: monospace;
    font-size: 0.875rem;
    color: var(--text-muted);
    min-width: 70px;
    text-align: center;
  }

  .stop-btn {
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    border-radius: 4px;
    transition: all 0.15s;
  }

  .stop-btn:hover {
    background-color: var(--bg-surface-hover);
    color: var(--text-main);
  }

  .topbar-action {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    color: var(--text-muted);
    border-radius: var(--radius-md);
    transition: all 0.15s;
    height: 36px;
  }

  .topbar-action:hover {
    background-color: var(--bg-surface-hover);
    color: var(--text-main);
  }

  .timer-label {
    font-size: 0.875rem;
    font-weight: 500;
  }

  .timer-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.5rem;
    width: 320px;
    background-color: var(--bg-surface);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-md);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 50;
    overflow: hidden;
  }

  .dropdown-search {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-main);
  }

  .search-icon {
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .dropdown-search input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    font-size: 0.875rem;
    color: var(--text-main);
  }

  .dropdown-search input::placeholder {
    color: var(--text-muted);
  }

  .task-list {
    max-height: 280px;
    overflow-y: auto;
    padding: 0.5rem;
  }

  .task-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    padding: 0.625rem 0.75rem;
    border-radius: var(--radius-sm);
    text-align: left;
    gap: 0.125rem;
    transition: background-color 0.1s;
  }

  .task-item:hover {
    background-color: var(--bg-surface-hover);
  }

  .task-name {
    font-size: 0.875rem;
    color: var(--text-main);
    font-weight: 500;
  }

  .task-project {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .loading-tasks,
  .no-tasks {
    padding: 1rem;
    text-align: center;
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .dropdown-footer {
    padding: 0.625rem 1rem;
    border-top: 1px solid var(--border-main);
  }

  .manual-link {
    font-size: 0.8125rem;
    color: var(--text-muted);
    text-decoration: underline;
    transition: color 0.15s;
  }

  .manual-link:hover {
    color: var(--text-main);
  }
</style>