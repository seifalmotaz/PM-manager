<script lang="ts">
  import { onMount } from 'svelte'
  import { getOrganization } from '$lib/stores/organization.svelte'
  import { tasks, isLoading, selectedTask, fetchOverdueCount } from '$lib/stores/tasks'
  import { showToast } from '$lib/stores/toast.svelte'
  import KanbanBoard from '$lib/components/KanbanBoard.svelte'
  import TaskCard from '$lib/components/TaskCard.svelte'
  import QuickAddInput from '$lib/components/QuickAddInput.svelte'
  import { trpc } from '$lib/trpc'
  import type { TaskSummary } from '$lib/stores/tasks'
  import { Filter, SortAsc, LayoutGrid, List } from 'lucide-svelte'
  import { clsx } from 'clsx'

  let { data } = $props()

  let orgSlug = $derived(data.orgSlug)
  let viewMode = $state<'kanban' | 'list'>('kanban')
  let showCreateModal = $state(false)
  let createModalProjectId = $state('')
  let orgName = $state('')
  let orgId = $state('')
  let isPageLoading = $state(true)

  onMount(async () => {
    const orgs = getOrganization().organizations
    const org = orgs.find(o => o.slug === orgSlug)
    if (org) {
      orgId = org.id
      orgName = org.name
      await fetchOrgTasks(org.id)
    } else {
      orgId = orgSlug
      orgName = orgSlug
      await fetchOrgTasks(orgSlug)
    }
    isPageLoading = false
    fetchOverdueCount()
  })

  async function fetchOrgTasks(organizationId: string) {
    isLoading.set(true)
    try {
      const orgTasks = await trpc.task.listByOrg.query({ organizationId }) as any[]
      tasks.set(orgTasks)
    } catch (err) {
      console.error('Failed to fetch org tasks:', err)
      showToast('Failed to load tasks. Please try again.', 'error')
      tasks.set([])
    } finally {
      isLoading.set(false)
    }
  }

  async function handleStatusChange(taskId: string, newStatus: string) {
    try {
      await trpc.task.changeStatus.mutate({ id: taskId, status: newStatus as 'todo' | 'in_progress' | 'review' | 'done' })
      if (orgId) await fetchOrgTasks(orgId)
    } catch (err) {
      console.error('Failed to change task status:', err)
      showToast('Failed to update task status. Please try again.', 'error')
    }
  }

  function handleTaskClick(task: TaskSummary) {
    selectedTask.set(task)
  }

  function handleCreated() {
    if (orgId) fetchOrgTasks(orgId)
    fetchOverdueCount()
  }

  function handleAddWithDetails(projectId: string) {
    createModalProjectId = projectId
    showCreateModal = true
  }

  const columns = [
    { id: 'todo', label: 'To Do' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'review', label: 'Review' },
    { id: 'done', label: 'Done' },
  ]
</script>

<div class="org-home-page">
  <div class="centered-well">
    <header class="page-header">
      <div class="header-main">
        <h1 class="page-title">{orgName}</h1>
        <span class="page-subtitle">{orgSlug} tasks</span>
      </div>

      <div class="header-actions">
        <div class="view-toggle">
          <button
            class={clsx('toggle-btn', viewMode === 'kanban' && 'active')}
            onclick={() => (viewMode = 'kanban')}
            title="Kanban View"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            class={clsx('toggle-btn', viewMode === 'list' && 'active')}
            onclick={() => (viewMode = 'list')}
            title="List View"
          >
            <List size={16} />
          </button>
        </div>

        <div class="divider"></div>

        <button class="action-btn">
          <Filter size={16} />
          <span>Filter</span>
        </button>
        <button class="action-btn">
          <SortAsc size={16} />
          <span>Sort</span>
        </button>
      </div>
    </header>

    <div class="quick-add-wrapper">
      <QuickAddInput
        onCreated={handleCreated}
        onAddWithDetails={handleAddWithDetails}
        orgId={orgId}
      />
    </div>
  </div>

  <div class="page-content">
    {#if isPageLoading || $isLoading}
      <div class="centered-well">
        <div class="status-container">
          <div class="spinner"></div>
          <p>Loading tasks for {orgName || orgSlug}...</p>
        </div>
      </div>
    {:else if $tasks.length === 0}
      <div class="centered-well">
        <div class="status-container">
          <p class="empty-msg">No tasks yet in this organization.</p>
          <p class="empty-hint">Use QuickAdd above to create your first task.</p>
        </div>
      </div>
    {:else if viewMode === 'kanban'}
      <div class="kanban-outer-container">
        <KanbanBoard
          tasks={$tasks}
          onStatusChange={handleStatusChange}
          onTaskClick={handleTaskClick}
          showOrgBadges={false}
        />
      </div>
    {:else}
      <div class="centered-well">
        <div class="task-list-view">
          {#each columns as col}
            {@const colTasks = $tasks.filter(t => t.status === col.id)}
            {#if colTasks.length > 0}
              <div class="list-section">
                <h3 class="section-title">{col.label} <span class="count">{colTasks.length}</span></h3>
                <div class="list-items">
                  {#each colTasks as task (task.id)}
                    <div class="task-item-wrapper">
                      <TaskCard task={task} onclick={() => handleTaskClick(task)} />
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .org-home-page {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 2rem;
    padding-top: 1.5rem;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 2.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-main);
  }

  .header-main {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
  }

  .page-title {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--text-main);
    line-height: 1.2;
  }

  .page-subtitle {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .view-toggle {
    display: flex;
    padding: 2px;
    gap: 0.25rem;
  }

  .toggle-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    border-radius: 4px;
    transition: all 0.15s;
  }

  .toggle-btn.active {
    background-color: var(--td-hover);
    color: var(--text-main);
  }

  .divider {
    width: 1px;
    height: 16px;
    background-color: var(--border-main);
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0;
    background-color: transparent;
    border: none;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-muted);
    transition: color 0.15s;
  }

  .action-btn:hover {
    color: var(--text-main);
  }

  .page-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    min-height: 0;
  }

  .centered-well {
    max-width: 900px;
    margin: 0 auto;
    width: 100%;
  }

  .kanban-outer-container {
    width: 100%;
    padding: 0 2rem;
    flex: 1;
    overflow-x: auto;
  }

  .task-list-view {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding-top: 1rem;
  }

  .list-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .section-title {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--text-main);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0 0.5rem;
  }

  .section-title .count {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-muted);
  }

  .list-items {
    display: flex;
    flex-direction: column;
  }

  .task-item-wrapper {
    border-radius: var(--radius-md);
  }

  .task-item-wrapper:hover {
    background-color: var(--bg-surface-hover);
  }

  .quick-add-wrapper {
    max-width: 800px;
    margin: 0 auto;
  }

  .status-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    color: var(--text-muted);
    min-height: 200px;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--border-main);
    border-top-color: var(--brand-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .empty-msg {
    font-size: 1rem;
    opacity: 0.7;
  }

  .empty-hint {
    font-size: 0.875rem;
    opacity: 0.5;
  }
</style>