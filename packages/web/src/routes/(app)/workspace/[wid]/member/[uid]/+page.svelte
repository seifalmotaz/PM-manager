<script lang="ts">
  import { goto } from '$app/navigation'
  import { ArrowLeft, User, BarChart3, ListTodo, Clock } from 'lucide-svelte'
  import { selectedTask } from '$lib/stores/tasks'

  let { data } = $props()

  const member = $derived(data.member)
  const user = $derived(member.user || member)
  const name = $derived(user.name || 'Unknown')
  const email = $derived(user.email || '')
  const role = $derived(member.role || 'member')
  const tasks = $derived(data.tasks || [])
  const velocity = $derived(data.velocity)
  const workspace = $derived(data.workspace)

  // Priority colors
  const priorityColors: Record<string, string> = {
    p0: '#ef4444',
    p1: '#f59e0b',
    p2: '#eab308',
    p3: '#9ca3af',
  }

  function handleTaskClick(task: any) {
    selectedTask.set({ id: task.id } as any)
  }

  function handleBack() {
    goto(`/projects`)
  }
</script>

<div class="employee-page">
  <!-- Back button -->
  <button class="back-btn" onclick={handleBack}>
    <ArrowLeft size={16} />
    <span>Back to workspace</span>
  </button>

  <!-- Header -->
  <div class="employee-header">
    <div class="avatar-large">
      {name[0]?.toUpperCase() || '?'}
    </div>
    <div class="header-info">
      <h1>{name}</h1>
      <p class="email">{email}</p>
      <span class="role-badge" class:admin={role === 'admin' || role === 'owner'}>
        {role}
      </span>
      <span class="workspace-name">{workspace?.name || ''}</span>
    </div>
  </div>

  <!-- Velocity Section -->
  <section class="section">
    <h2><BarChart3 size={18} /> Velocity (Last 90 Days)</h2>
    {#if velocity}
      <div class="metrics-row">
        <div class="metric-card">
          <span class="metric-value">{velocity.completedPoints}</span>
          <span class="metric-label">Story Points</span>
        </div>
        <div class="metric-card">
          <span class="metric-value">{velocity.taskCount}</span>
          <span class="metric-label">Tasks Completed</span>
        </div>
      </div>
    {:else}
      <p class="empty-text">Velocity data not available</p>
    {/if}
  </section>

  <!-- Current Workload -->
  <section class="section">
    <h2><Clock size={18} /> Current Workload</h2>
    <div class="metrics-row">
      <div class="metric-card">
        <span class="metric-value">{tasks.filter((t: any) => t.status !== 'done').length}</span>
        <span class="metric-label">Active Tasks</span>
      </div>
      <div class="metric-card">
        <span class="metric-value">{tasks.filter((t: any) => t.status === 'done').length}</span>
        <span class="metric-label">Completed</span>
      </div>
    </div>
  </section>

  <!-- Assigned Tasks -->
  <section class="section">
    <h2><ListTodo size={18} /> Assigned Tasks</h2>
    {#if tasks.length > 0}
      <div class="task-list">
        {#each tasks as task}
          <button class="task-item" onclick={() => handleTaskClick(task)}>
            <span class="priority-dot" style="background: {priorityColors[task.priority as string] || '#9ca3af'}"></span>
            <span class="task-title">{task.title}</span>
            <span class="task-status">{task.status}</span>
          </button>
        {/each}
      </div>
    {:else}
      <p class="empty-text">No tasks assigned</p>
    {/if}
  </section>
</div>

<style>
  .employee-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .back-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    margin-bottom: 1.5rem;
    padding: 0.25rem 0;
    transition: color 0.15s;
  }
  .back-btn:hover {
    color: var(--text-main);
  }

  .employee-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--border-main);
  }

  .avatar-large {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--brand-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .header-info h1 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-main);
    margin: 0;
  }

  .email {
    color: var(--text-muted);
    font-size: 0.875rem;
    margin: 0.25rem 0 0.5rem;
  }

  .role-badge {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    background: var(--bg-surface-hover);
    color: var(--text-muted);
    text-transform: capitalize;
  }
  .role-badge.admin {
    background: rgba(99, 102, 241, 0.15);
    color: #818cf8;
  }

  .workspace-name {
    margin-left: 0.75rem;
    color: var(--text-muted);
    font-size: 0.875rem;
  }

  .section {
    margin-bottom: 2rem;
  }
  .section h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-main);
    margin: 0 0 1rem;
  }

  .metrics-row {
    display: flex;
    gap: 1rem;
  }

  .metric-card {
    flex: 1;
    background: var(--bg-surface);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-md);
    padding: 1rem;
    text-align: center;
  }
  .metric-value {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-main);
  }
  .metric-label {
    display: block;
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .empty-text {
    color: var(--text-muted);
    font-size: 0.875rem;
    font-style: italic;
  }

  .task-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .task-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--bg-surface);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-md);
    cursor: pointer;
    color: var(--text-main);
    font-size: 0.875rem;
    transition: background 0.15s;
    width: 100%;
    text-align: left;
  }
  .task-item:hover {
    background: var(--bg-surface-hover);
  }

  .priority-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .task-title {
    flex: 1;
  }

  .task-status {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: capitalize;
  }
</style>