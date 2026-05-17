<script lang="ts">
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	import { auth } from '$lib/stores/auth.svelte'
	import { task, type CreateTaskInput, type UpdateTaskInput, type Task } from '$lib/stores/task.svelte'
	import { sprint, type CreateSprintInput } from '$lib/stores/sprint.svelte'
	import { trpc } from '$lib/trpc'
	import ProjectHeader from '$lib/components/projects/ProjectHeader.svelte'
	import ProjectBoard from '$lib/components/board/ProjectBoard.svelte'
	import BacklogView from '$lib/components/projects/BacklogView.svelte'
	import TaskDetailModal from '$lib/components/tasks/TaskDetailModal.svelte'
	import SprintCreateModal from '$lib/components/sprints/SprintCreateModal.svelte'

	interface Project {
		id: string
		workspaceId: string
		name: string
		description: string | null
		color: string | null
		isInbox: boolean
		createdAt: string
		updatedAt: string
	}

	let id = $derived($page.params.id)

	let project = $state<Project | null>(null)
	let isLoadingProject = $state(false)
	let projectError = $state<string | null>(null)
	let activeTab = $state<'board' | 'backlog'>('board')
	let boardMode = $state<'status' | 'sprint'>('status')
	let selectedTaskId = $state<string | null>(null)
	let showSprintCreateModal = $state(false)

	let shouldLoad = $derived.by(() => {
		if (auth.isLoading) return false
		if (!auth.user) return false
		if (!id) return false
		return true
	})

	$effect(() => {
		if (!shouldLoad) {
			if (!auth.isLoading && !auth.user) {
				goto('/auth/login')
			}
			return
		}

		loadProjectData()
	})

	async function loadProjectData() {
		isLoadingProject = true
		projectError = null

		try {
			const result = await trpc.project.byId.query({ id })
			project = result as Project
			await Promise.all([
				task.loadTasksByProject(id),
				sprint.loadSprintsByProject(id)
			])
		} catch (err) {
			projectError = err instanceof Error ? err.message : 'Failed to load project'
		} finally {
			isLoadingProject = false
		}
	}

	function handleAddTask(columnKey: string, title: string, extras?: { priority?: string; dueDate?: string; storyPoints?: number; assignee?: string }) {
		if (!project) return

		const input: CreateTaskInput = {
			projectId: project.id,
			title,
			priority: (extras?.priority ?? undefined) as CreateTaskInput['priority'],
			dueDate: extras?.dueDate ?? undefined,
			storyPoints: extras?.storyPoints ?? undefined
		}

		if (extras?.assignee === 'me' && auth.user) {
			input.assigneeId = auth.user.id
		}

		if (boardMode === 'sprint') {
			input.sprintId = columnKey === 'backlog' ? undefined : columnKey
		}
		task.createTask(input)
	}

	function handleMoveTask(taskId: string, targetColumnKey: string) {
		if (boardMode === 'status') {
			// targetColumnKey is a status
			task.changeStatus(taskId, targetColumnKey as 'todo' | 'in_progress' | 'done')
		} else {
			// Sprint mode: targetColumnKey is sprintId or 'backlog'
			const sprintId = targetColumnKey === 'backlog' ? null : targetColumnKey
			task.updateTask(taskId, { sprintId })
		}
	}

	function handleSelectTask(taskId: string) {
		selectedTaskId = taskId
	}

	function handleSaveTask(id: string, updates: UpdateTaskInput) {
		task.updateTask(id, updates)
		selectedTaskId = null
	}

	function handleDeleteTask(id: string) {
		if (!project) return
		task.deleteTask(id, project.id)
		selectedTaskId = null
	}

	function handleChangeTaskStatus(id: string, status: Task['status']) {
		task.changeStatus(id, status)
	}

	function handleRetry() {
		loadProjectData()
	}

	function handleTabChange(tab: 'board' | 'backlog') {
		activeTab = tab
	}

	function handleBoardModeChange(mode: 'status' | 'sprint') {
		boardMode = mode
	}

	function handleNewSprint() {
		showSprintCreateModal = true
	}

	function handleCreateSprint(input: CreateSprintInput) {
		sprint.createSprint(input)
		showSprintCreateModal = false
	}

	function handleAssignSprint(taskId: string, sprintId: string | null) {
		task.updateTask(taskId, { sprintId })
	}
</script>

<div class="project-page">
	{#if isLoadingProject}
		<div class="loading-state">
			<p>Loading project...</p>
		</div>
	{:else if projectError}
		<div class="error-banner">
			<p class="error-message">{projectError}</p>
			<button class="btn-retry" onclick={handleRetry}>Retry</button>
		</div>
	{:else if project}
		<ProjectHeader
			{project}
			{activeTab}
			{boardMode}
			isLoading={isLoadingProject}
			onTabChange={handleTabChange}
			onBoardModeChange={handleBoardModeChange}
			onNewSprint={handleNewSprint}
		/>

		{#if activeTab === 'board'}
			<ProjectBoard
				tasks={task.tasks}
				sprints={sprint.sprints}
				mode={boardMode}
				onAddTask={handleAddTask}
				onMoveTask={handleMoveTask}
				onSelectTask={handleSelectTask}
			/>
		{:else}
			<BacklogView
				tasks={task.tasks}
				sprints={sprint.sprints}
				projectId={project.id}
				isLoading={task.isLoading}
				onAssignSprint={handleAssignSprint}
				onCreateTask={(title, extras) => handleAddTask('backlog', title, extras)}
				onSelectTask={handleSelectTask}
			/>
		{/if}
	{:else}
		<div class="empty-state">
			<p>Project not found</p>
		</div>
	{/if}

		<TaskDetailModal
			isOpen={!!selectedTaskId}
			task={task.tasks.find(t => t.id === selectedTaskId) ?? null}
			sprints={sprint.sprints}
			isLoading={task.isUpdating}
			onClose={() => selectedTaskId = null}
			onSave={handleSaveTask}
			onDelete={handleDeleteTask}
			onChangeStatus={handleChangeTaskStatus}
		/>

		<SprintCreateModal
			isOpen={showSprintCreateModal}
			projectId={project?.id ?? ''}
			isLoading={sprint.isCreating}
			onClose={() => showSprintCreateModal = false}
			onSubmit={handleCreateSprint}
		/>
	</div>

<style>
	.project-page {
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: 24px 32px;
		overflow: hidden;
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