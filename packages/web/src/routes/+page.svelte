<script lang="ts">
  import { goto } from '$app/navigation'
  import { auth } from '$lib/stores/auth.svelte'
  import { trpc } from '$lib/trpc'
  import { toast } from '$lib/stores/toast.svelte'
  import KanbanBoard from '$lib/components/board/KanbanBoard.svelte'
  import { workspace } from '$lib/stores/workspace.svelte'
  import { organization } from '$lib/stores/organization.svelte'
  import { task, type UpdateTaskInput, type Task } from '$lib/stores/task.svelte'
  import TaskDetailModal from '$lib/components/tasks/TaskDetailModal.svelte'

  let isCheckingOrg = $state(true)
  let isLoadingTasks = $state(false)
  let tasksError = $state<string | null>(null)
  let selectedTaskId = $state<string | null>(null)
  let showDetailModal = $state(false)

  $effect(() => {
    // Wait for auth restoration to complete before checking anything
    if (auth.isLoading) return

    // Auth check is complete — evaluate state
    if (!auth.user) {
      goto('/auth/login')
      return
    }

    // User is authenticated — check organization status
    const workosUserId = auth.workosUserId
    if (!workosUserId) {
      goto('/auth/login')
      return
    }

    trpc.auth.hasOrganization.query({ workosUserId })
      .then((result) => {
        if (!result.hasOrg) {
          goto('/auth/onboarding')
        }
      })
      .catch((error) => {
        console.error('Failed to check organization:', error)
        // On error, stay on page and let user proceed
      })
      .finally(() => {
        isCheckingOrg = false
      })
  })

  $effect(() => {
    if (!isCheckingOrg && auth.user && organization.activeOrganization) {
      loadHomeData()
    }
  })

  async function loadHomeData() {
    isLoadingTasks = true
    tasksError = null

    const orgId = organization.activeOrganization?.id
    if (!orgId) {
      isLoadingTasks = false
      return
    }

    try {
      await workspace.loadWorkspaces(orgId)
      const workspaceIds = workspace.workspaces.map((w) => w.id)
      if (auth.user && workspaceIds.length > 0) {
        await task.loadMyTasks(workspaceIds, auth.user.id)
      }
    } catch (err: any) {
      tasksError = err?.message ?? 'Failed to load tasks'
    } finally {
      isLoadingTasks = false
    }
  }

  function handleSelectTask(taskId: string) {
    selectedTaskId = taskId
    showDetailModal = true
  }

  function handleMoveTask(taskId: string, targetStatus: string) {
    task.changeStatus(taskId, targetStatus as Task['status'])
  }

  function handleSaveTask(id: string, updates: UpdateTaskInput) {
    task.updateTask(id, updates)
    showDetailModal = false
  }

  function handleDeleteTask(id: string) {
    task.deleteTask(id)
    showDetailModal = false
  }

  function handleChangeStatus(id: string, status: Task['status']) {
    task.changeStatus(id, status)
  }

  function handleRetry() {
    loadHomeData()
  }
</script>

{#if auth.isLoading || isCheckingOrg}
  <div class="loading-page">
    <p>Loading...</p>
  </div>
{:else if auth.user}
  <div class="home-page">
    {#if isLoadingTasks}
      <div class="loading-state">
        <p>Loading your tasks...</p>
      </div>
    {:else if tasksError}
      <div class="error-banner">
        <p class="error-message">{tasksError}</p>
        <button class="btn-retry" onclick={handleRetry}>Retry</button>
      </div>
    {:else if task.tasks.length === 0}
      <div class="empty-state">
        <p>No tasks assigned to you yet.</p>
      </div>
    {:else}
      <KanbanBoard
        tasks={task.tasks}
        onSelectTask={handleSelectTask}
        onMoveTask={handleMoveTask}
      />
    {/if}
  </div>

  <TaskDetailModal
    isOpen={showDetailModal}
    task={task.tasks.find((t) => t.id === selectedTaskId) ?? null}
    sprints={[]}
    isLoading={task.isUpdating}
    onClose={() => { showDetailModal = false; selectedTaskId = null; }}
    onSave={handleSaveTask}
    onDelete={handleDeleteTask}
    onChangeStatus={handleChangeStatus}
  />
{/if}

<style>
  .loading-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--bg-app);
    color: var(--text-muted);
  }

  .home-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 16px;
  }

  .loading-state {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 200px;
    color: var(--text-muted);
  }

  .error-banner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 48px 24px;
    text-align: center;
    background: rgba(219, 76, 63, 0.1);
    border: 1px solid rgba(219, 76, 63, 0.3);
    border-radius: var(--radius-lg);
  }

  .error-message {
    font-size: 0.9375rem;
    color: var(--brand-primary);
    margin: 0;
  }

  .btn-retry {
    padding: 10px 20px;
    font-size: 0.875rem;
    font-weight: 500;
    background: var(--brand-primary);
    color: var(--text-inverse);
    border-radius: var(--radius-md);
    transition: background-color 0.15s ease;
    cursor: pointer;
  }

  .btn-retry:hover {
    background: var(--brand-hover);
  }

  .empty-state {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 200px;
    color: var(--text-muted);
  }
</style>
