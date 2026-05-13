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
    ArrowRight
  } from 'lucide-svelte'
  import { clsx } from 'clsx'
  import { goto } from '$app/navigation'
  import { tasks } from '$lib/stores/tasks'
  import { workspaces } from '$lib/stores/workspaces'
  // @ts-ignore
  import commandScore from 'command-score'

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

  const staticCommands = [
    { id: 'go-home', title: 'Go to Home', icon: Search, type: 'command', action: () => goto('/home') },
    { id: 'go-velocity', title: 'Go to Velocity', icon: BarChart2, type: 'command', action: () => goto('/velocity') },
    { id: 'go-projects', title: 'Go to Projects', icon: Layers, type: 'command', action: () => goto('/projects') },
    { id: 'new-task', title: 'Create New Task', icon: Plus, type: 'command', action: () => { onNewTask?.() } },
    { id: 'start-timer', title: 'Start Timer', icon: Clock, type: 'command', action: () => {/* Logic for timer */} },
  ]

  let results = $derived.by(() => {
    if (!query) return staticCommands.map(c => ({ ...c, score: 1 }))

    const dynamicResults = [
      ...staticCommands,
      ...$tasks.map(t => ({ id: `task-${t.id}`, title: t.title, type: 'task', icon: FileText, action: () => goto(`/home`) })), // Simplified
      ...$workspaces.map(w => ({ id: `ws-${w.id}`, title: w.name, type: 'workspace', icon: Layers, action: () => {/* Switch WS */} }))
    ]

    return dynamicResults
      .map(item => ({
        ...item,
        score: commandScore(item.title, query)
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  })

  $effect(() => {
    if (isOpen) {
      setTimeout(() => inputEl?.focus(), 10)
      selectedIndex = 0
    }
  })

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      isOpen = false
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      selectedIndex = (selectedIndex + 1) % results.length
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      selectedIndex = (selectedIndex - 1 + results.length) % results.length
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = results[selectedIndex]
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
          bind:value={query}
          onkeydown={handleKeydown}
          placeholder="Search for tasks, projects, or commands..."
          type="text"
        />
        <div class="esc-hint">ESC</div>
      </div>

      <div class="results-list">
        {#each results as result, i (result.id)}
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
              {#if result.type}
                <span class="result-type">{result.type}</span>
              {/if}
            </div>
            {#if i === selectedIndex}
              <ArrowRight size={14} class="enter-icon" />
            {/if}
          </button>
        {:else}
          <div class="no-results">
            <p>No results found for "{query}"</p>
          </div>
        {/each}
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
    background-color: var(--zinc-800);
    box-shadow: inset 0 0 0 1px var(--zinc-700);
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
  }

  .result-item.selected .result-icon {
    color: var(--brand-primary);
    background-color: var(--zinc-950);
  }

  .result-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .result-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-main);
  }

  .result-type {
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.025em;
    color: var(--text-muted);
    font-weight: 600;
  }

  .enter-icon {
    color: var(--brand-primary);
    opacity: 0.7;
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
