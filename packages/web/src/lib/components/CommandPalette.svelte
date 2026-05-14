<script lang="ts">
  import { onMount } from 'svelte'
  import { 
    Search, 
    Plus, 
    FileText, 
    Layers, 
    BarChart2, 
    Clock, 
    User,
    Command,
    ArrowRight,
    Circle,
    Play,
    Eye,
    CheckCircle,
    Home,
    Inbox
  } from 'lucide-svelte'
  import { clsx } from 'clsx'
  import { goto } from '$app/navigation'
  import { selectedTask } from '$lib/stores/tasks'
  import { activeFilterIds } from '$lib/stores/workspaces'
  import { get } from 'svelte/store'
  import { trpc } from '$lib/trpc'
  // @ts-ignore
  import commandScore from 'command-score'
  // @ts-ignore
  import { parseTaskInput } from 'shared/nlp-parser'

  let {
    isOpen = $bindable(false),
    onNewTask,
  }: {
    isOpen?: boolean
    onNewTask?: () => void
  } = $props()

  let query = $state('')
  let selectedIndex = $state(0)
  let inputEl = $state<HTMLInputElement>()
  let searchResults = $state<{
    tasks: Array<{ id: string; title: string; status: string; priority: string | null; project?: { name: string } }>
  }>({ tasks: [] })
  let loading = $state(false)
  let debounceTimer: ReturnType<typeof setTimeout> | null = $state(null)

  const statusIcons: Record<string, typeof Circle> = {
    todo: Circle,
    in_progress: Play,
    review: Eye,
    done: CheckCircle,
  }

  const priorityColors: Record<string, string> = {
    p0: '#ef4444',
    p1: '#f59e0b',
    p2: '#eab308',
    p3: '#9ca3af',
  }

  const navigationItems = [
    { id: 'nav-home', title: '/home', label: 'Go to Home', icon: Home, action: () => goto('/home') },
    { id: 'nav-velocity', title: '/velocity', label: 'Go to Velocity', icon: BarChart2, action: () => goto('/velocity') },
    { id: 'nav-projects', title: '/projects', label: 'Go to Projects', icon: Layers, action: () => goto('/projects') },
  ]

  let flatResults = $derived.by(() => {
    const items: Array<{
      id: string
      title: string
      type: string
      icon: typeof Circle
      action: () => void
      subtitle?: string
      priorityColor?: string
    }> = []

    // Navigation items
    const navFiltered = navigationItems.filter(n => 
      n.title.toLowerCase().includes(query.toLowerCase()) ||
      n.label.toLowerCase().includes(query.toLowerCase())
    )
    for (const nav of navFiltered) {
      items.push({
        id: nav.id,
        title: nav.title,
        type: 'navigation',
        icon: nav.icon,
        action: nav.action,
        subtitle: nav.label,
      })
    }

    // Task results
    for (const task of searchResults.tasks) {
      items.push({
        id: `task-${task.id}`,
        title: task.title,
        type: 'task',
        icon: statusIcons[task.status] ?? Circle,
        action: () => {
          selectedTask.set(task as any)
          isOpen = false
        },
        subtitle: task.project?.name,
        priorityColor: task.priority ? priorityColors[task.priority] : undefined,
      })
    }

    // Quick create mode
    if (query.startsWith('>')) {
      const parsed = parseTaskInput(query.slice(1).trim())
      items.push({
        id: 'quick-create',
        title: parsed.title || 'New Task',
        type: 'quick-create',
        icon: Plus,
        action: () => {
          // TODO: Implement quick create
          console.log('Quick create:', parsed)
          isOpen = false
        },
        subtitle: [
          parsed.priority ? parsed.priority.toUpperCase() : null,
          parsed.storyPoints ? `SP ${parsed.storyPoints}` : null,
          parsed.assigneeUsername ? `@${parsed.assigneeUsername}` : null,
        ].filter(Boolean).join(' · ') || 'Create new task',
      })
    }

    return items
  })

  $effect(() => {
    if (isOpen) {
      setTimeout(() => inputEl?.focus(), 10)
      selectedIndex = 0
      query = ''
      searchResults = { tasks: [] }
    }
  })

  async function fetchResults(q: string) {
    if (!q.trim()) {
      searchResults = { tasks: [] }
      loading = false
      return
    }

    // Quick create mode
    if (q.startsWith('>')) {
      loading = false
      return
    }

    // Navigation commands
    if (q.startsWith('/')) {
      loading = false
      return
    }

    loading = true
    try {
      const data = await trpc.task.search.query({ 
        query: q, 
        workspaceIds: get(activeFilterIds) 
      })
      searchResults = data as typeof searchResults
    } catch (err) {
      console.error('Search failed:', err)
      searchResults = { tasks: [] }
    } finally {
      loading = false
    }
  }

  function handleInput(e: Event) {
    const value = (e.target as HTMLInputElement).value
    query = value

    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => fetchResults(value), 150)
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      isOpen = false
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      selectedIndex = (selectedIndex + 1) % Math.max(flatResults.length, 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      selectedIndex = (selectedIndex - 1 + Math.max(flatResults.length, 1)) % Math.max(flatResults.length, 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = flatResults[selectedIndex]
      if (selected) {
        selected.action()
        isOpen = false
      }
    }
  }

  onMount(() => {
    const handleGlobalKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        isOpen = !isOpen
      }
    }
    window.addEventListener('keydown', handleGlobalKeydown)
    return () => window.removeEventListener('keydown', handleGlobalKeydown)
  })
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="command-palette-overlay" onclick={() => isOpen = false}>
    <div class="command-palette-container" onclick={e => e.stopPropagation()}>
      <div class="search-input-wrapper">
        <Search size={20} class="search-icon" />
        <input
          bind:this={inputEl}
          value={query}
          oninput={handleInput}
          onkeydown={handleKeydown}
          placeholder="Search for tasks, projects, or commands..."
          type="text"
        />
        {#if loading}
          <div class="loading-spinner"></div>
        {/if}
        <div class="esc-hint">ESC</div>
      </div>

      <div class="results-list">
        {#if flatResults.length > 0}
          {#each flatResults as result, i (result.id)}
            <button 
              class={clsx('result-item', i === selectedIndex && 'selected')}
              onclick={() => { result.action(); isOpen = false; }}
              onmouseenter={() => selectedIndex = i}
            >
              <div class="result-icon">
                <result.icon size={18} />
              </div>
              <div class="result-info">
                <span class="result-title">{result.title}</span>
                {#if result.subtitle}
                  <span class="result-subtitle">{result.subtitle}</span>
                {/if}
              </div>
              {#if result.priorityColor}
                <span class="priority-dot" style="background-color: {result.priorityColor}"></span>
              {/if}
              {#if i === selectedIndex}
                <ArrowRight size={14} class="enter-icon" />
              {/if}
            </button>
          {/each}
        {:else if query && !loading}
          <div class="no-results">
            <p>No results found for "{query}"</p>
          </div>
        {:else}
          <div class="no-results">
            <p>Start typing to search, or use "/" for navigation, ">" to create a task</p>
          </div>
        {/if}
      </div>

      <div class="palette-footer">
        <div class="footer-hint">
          <Command size={12} />
          <span>K</span>
          <span class="hint-text">to toggle</span>
        </div>
        <div class="footer-hint">
          <span class="key-symbol">↑↓</span>
          <span class="hint-text">to navigate</span>
        </div>
        <div class="footer-hint">
          <span class="key-symbol">↵</span>
          <span class="hint-text">to select</span>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .command-palette-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    display: flex;
    justify-content: center;
    padding-top: 20vh;
    z-index: 1000;
  }

  .command-palette-container {
    width: 100%;
    max-width: 640px;
    height: fit-content;
    background-color: var(--bg-surface);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-lg);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    animation: slideUp 0.15s ease-out;
  }

  @keyframes slideUp {
    from { transform: translateY(10px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .search-input-wrapper {
    display: flex;
    align-items: center;
    padding: 1rem 1.25rem;
    gap: 1rem;
    border-bottom: 1px solid var(--border-main);
  }

  .search-icon {
    color: var(--brand-primary);
  }

  input {
    flex: 1;
    font-size: 1rem;
    color: var(--text-main);
    background: none;
    border: none;
    outline: none;
  }

  input::placeholder {
    color: var(--text-muted);
  }

  .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--border-main);
    border-top-color: var(--brand-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .esc-hint {
    font-size: 0.6875rem;
    background-color: var(--zinc-800);
    padding: 2px 6px;
    border-radius: 4px;
    color: var(--text-muted);
    font-weight: 600;
  }

  .results-list {
    max-height: 400px;
    overflow-y: auto;
    padding: 0.5rem;
  }

  .result-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 0.75rem;
    border-radius: var(--radius-md);
    transition: all 0.15s;
    text-align: left;
  }

  .result-item.selected {
    background-color: var(--td-hover);
    box-shadow: inset 0 0 0 1px var(--border-main);
  }

  .result-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background-color: var(--zinc-900);
    border-radius: 6px;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .result-item.selected .result-icon {
    color: var(--brand-primary);
    background-color: var(--zinc-950);
  }

  .result-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .result-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-main);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .result-subtitle {
    font-size: 0.6875rem;
    color: var(--text-muted);
    margin-top: 2px;
  }

  .priority-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .enter-icon {
    color: var(--brand-primary);
    opacity: 0.7;
    flex-shrink: 0;
  }

  .no-results {
    padding: 2rem;
    text-align: center;
    color: var(--text-muted);
  }

  .palette-footer {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 0.75rem 1.25rem;
    background-color: var(--zinc-950);
    border-top: 1px solid var(--border-main);
  }

  .footer-hint {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.6875rem;
    color: var(--text-muted);
  }

  .hint-text {
    opacity: 0.7;
  }

  .key-symbol {
    font-family: monospace;
    font-weight: bold;
    background-color: var(--zinc-800);
    padding: 1px 4px;
    border-radius: 3px;
  }
</style>