<script lang="ts">
  import { onMount } from 'svelte'
  import { tasks, isLoading, fetchAllTasks, selectedTask, fetchOverdueCount } from '$lib/stores/tasks'
  import { fetchActiveSessions, startElapsedTimer, getSessions } from '$lib/stores/org-sessions.svelte'
  import { getOrganization } from '$lib/stores/organization.svelte'
  import KanbanBoard from '$lib/components/KanbanBoard.svelte'
  import TaskCard from '$lib/components/TaskCard.svelte'
  import QuickAddInput from '$lib/components/QuickAddInput.svelte'
  import CrossOrgCompleteDialog from '$lib/components/CrossOrgCompleteDialog.svelte'
  import { trpc } from '$lib/trpc'
  import type { TaskSummary } from '$lib/stores/tasks'
  import { Filter, SortAsc, LayoutGrid, List } from 'lucide-svelte'
  import { clsx } from 'clsx'

  let viewMode = $state<'kanban' | 'list'>('kanban')
  let showCreateModal = $state(false)
  let createModalProjectId = $state('')
  let crossOrgDialog = $state<{
    taskId: string
    taskTitle: string
    taskOrgId: string
    taskOrgName: string
    activeOrgId: string
    activeOrgName: string
  } | null>(null)

  onMount(async () => {
    await fetchAllTasks()
    await fetchActiveSessions()
    startElapsedTimer()
    fetchOverdueCount()
  })

  async function handleStatusChange(taskId: string, newStatus: string) {
    if (newStatus !== 'done') {
      // Non-done status: complete normally
      try {
        await trpc.task.changeStatus.mutate({ id: taskId, status: newStatus as any })
        await fetchAllTasks()
      } catch (err) {
        console.error('Failed to change task status:', err)
      }
      return
    }

    // Task is being set to Done — check for cross-org situation
    const task = $tasks.find(t => t.id === taskId)
    if (!task) return

    const taskOrg = task.organization
    const sessionsList = getSessions().sessions

    if (taskOrg && sessionsList.length > 0) {
      // Check if task's org matches any active session's org
      const activeForTaskOrg = sessionsList.find(s => s.session.organizationId === taskOrg.id)

      if (!activeForTaskOrg) {
        // Cross-org situation: task org differs from clocked-in org
        const activeSession = sessionsList[0] // Use first active session
        const allOrgs = getOrganization().organizations
        const activeOrg = allOrgs.find(o => o.id === activeSession.session.organizationId)

        if (activeOrg) {
          crossOrgDialog = {
            taskId,
            taskTitle: task.title,
            taskOrgId: taskOrg.id,
            taskOrgName: taskOrg.name,
            activeOrgId: activeOrg.id,
            activeOrgName: activeOrg.name,
          }
          return
        }
      }
    }

    // No cross-org conflict — complete normally
    try {
      await trpc.task.changeStatus.mutate({ id: taskId, status: 'done' })
      await fetchAllTasks()
    } catch (err) {
      console.error('Failed to change task status:', err)
    }
  }

  function handleTaskClick(task: TaskSummary) {
    selectedTask.set(task)
  }

  function handleCreated() {
    fetchAllTasks()
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

<div class="my-work-page">
  <div class="centered-well">
    <header class="page-header">
      <div class="header-main">
        <h1 class="page-title">My Work</h1>
        <span class="page-subtitle">Tasks across all organizations</span>
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
      <QuickAddInput onCreated={handleCreated} onAddWithDetails={handleAddWithDetails} />
    </div>
  </div>

  <div class="page-content">
    {#if $isLoading}
      <div class="centered-well">
        <div class="status-container">
          <div class="spinner"></div>
          <p>Loading your tasks...</p>
        </div>
      </div>
    {:else if $tasks.length === 0}
      <div class="centered-well">
        <div class="status-container">
          <p class="empty-msg">No tasks yet. Create one to get started!</p>
        </div>
      </div>
    {:else if viewMode === 'kanban'}
      <div class="kanban-outer-container">
        <KanbanBoard
          tasks={$tasks}
          onStatusChange={handleStatusChange}
          onTaskClick={handleTaskClick}
          showOrgBadges={true}
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
                      <TaskCard task={task} onclick={() => handleTaskClick(task)} showOrgBadges={true} />
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          {/each}
        </div>
      </div>
    {/if}

    {#if crossOrgDialog}
      <CrossOrgCompleteDialog
        taskId={crossOrgDialog.taskId}
        taskTitle={crossOrgDialog.taskTitle}
        taskOrgId={crossOrgDialog.taskOrgId}
        taskOrgName={crossOrgDialog.taskOrgName}
        activeOrgId={crossOrgDialog.activeOrgId}
        activeOrgName={crossOrgDialog.activeOrgName}
        onClose={() => (crossOrgDialog = null)}
      />
    {/if}
  </div>
</div>

<style>
  .my-work-page {
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

  .centered-well {
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }
</style>