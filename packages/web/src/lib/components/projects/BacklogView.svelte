<script lang="ts">
	import type { Task } from '$lib/stores/task.svelte'
	import type { Sprint } from '$lib/stores/sprint.svelte'

	interface Props {
		tasks: Task[]
		sprints: Sprint[]
		projectId: string
		isLoading: boolean
		onAssignSprint: (taskId: string, sprintId: string | null) => void
		onCreateTask: (title: string, extras?: { priority?: string; dueDate?: string; storyPoints?: number }) => void
		onSelectTask: (taskId: string) => void
	}

	let {
		tasks,
		sprints,
		projectId,
		isLoading,
		onAssignSprint,
		onCreateTask,
		onSelectTask
	}: Props = $props()

	let showCreateInput = $state(false)
	let newTaskTitle = $state('')
	let isCreating = $state(false)

	const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
		p0: { bg: '#f44336', text: '#fff' },
		p1: { bg: '#ff9800', text: '#000' },
		p2: { bg: '#ffeb3b', text: '#000' },
		p3: { bg: '#9e9e9e', text: '#fff' }
	}

	const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
		todo: { bg: '#808080', text: '#fff' },
		in_progress: { bg: '#db4c3f', text: '#fff' },
		done: { bg: '#4caf50', text: '#fff' }
	}

	const backlogTasks = $derived(tasks.filter(t => t.sprintId === null))

	function formatDueDate(dateStr: string | null): string {
		if (!dateStr) return ''
		const date = new Date(dateStr)
		const now = new Date()
		const diff = date.getTime() - now.getTime()
		const days = Math.floor(diff / (1000 * 60 * 60 * 24))

		if (days < 0) return 'Overdue'
		if (days === 0) return 'Today'
		if (days === 1) return 'Tomorrow'
		if (days < 7) return `${days} days`
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
	}

	function handleSprintChange(taskId: string, e: Event) {
		const select = e.target as HTMLSelectElement
		const value = select.value
		onAssignSprint(taskId, value === '' ? null : value)
	}

	function handleCreateSubmit() {
		const trimmed = newTaskTitle.trim()
		if (!trimmed) return

		isCreating = true
		onCreateTask(trimmed)
		newTaskTitle = ''
		showCreateInput = false
		isCreating = false
	}

	function handleCreateKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault()
			handleCreateSubmit()
		} else if (e.key === 'Escape') {
			showCreateInput = false
			newTaskTitle = ''
		}
	}

	function handleRowClick(taskId: string, e: MouseEvent) {
		const target = e.target as HTMLElement
		if (target.tagName === 'SELECT') {
			return
		}
		onSelectTask(taskId)
	}
</script>

<div class="backlog-view">
	<div class="backlog-header">
		<div class="title-row">
			<h2 class="backlog-title">Backlog</h2>
			<span class="count-badge">{backlogTasks.length}</span>
		</div>
		<button
			class="btn-create"
			onclick={() => showCreateInput = !showCreateInput}
		>
			+ Create task
		</button>
	</div>

	{#if showCreateInput}
		<div class="create-input-container">
			<input
				type="text"
				class="create-input"
				placeholder="Task title..."
				bind:value={newTaskTitle}
				onkeydown={handleCreateKeydown}
				disabled={isCreating}
			/>
			<div class="create-actions">
				<button class="btn-submit" onclick={handleCreateSubmit} disabled={!newTaskTitle.trim() || isCreating}>
					{isCreating ? 'Creating...' : 'Create'}
				</button>
				<button class="btn-cancel" onclick={() => { showCreateInput = false; newTaskTitle = '' }}>
					Cancel
				</button>
			</div>
		</div>
	{/if}

	{#if isLoading}
		<div class="loading-state">
			<p>Loading backlog...</p>
		</div>
	{:else if backlogTasks.length === 0}
		<div class="empty-state">
			<p>No tasks in backlog. Create one to get started.</p>
		</div>
	{:else}
		<div class="task-list">
			{#each backlogTasks as task (task.id)}
				{@const statusColors = STATUS_COLORS[task.status]}
				{@const priorityColors = task.priority ? PRIORITY_COLORS[task.priority] : null}
				<div
					class="task-card"
					onclick={(e) => handleRowClick(task.id, e)}
					role="button"
					tabindex="0"
					onkeydown={(e) => e.key === 'Enter' && onSelectTask(task.id)}
				>
					<div class="task-main">
						<span class="task-title">{task.title}</span>
						{#if priorityColors}
							<span
								class="priority-badge"
								style="background: {priorityColors.bg}; color: {priorityColors.text}"
							>
								{task.priority?.toUpperCase()}
							</span>
						{/if}
					</div>

					<div class="task-meta">
						{#if task.dueDate}
							<span class="due-date">{formatDueDate(task.dueDate)}</span>
						{/if}
						<span
							class="status-badge"
							style="background: {statusColors.bg}; color: {statusColors.text}"
						>
							{task.status.replace('_', ' ')}
						</span>
					</div>

					<div class="sprint-assign">
						<select
							class="sprint-select"
							onchange={(e) => handleSprintChange(task.id, e)}
						>
							<option value="" disabled selected={!task.sprintId}>Assign to sprint...</option>
							{#each sprints as sprint}
								<option value={sprint.id} selected={sprint.id === task.sprintId}>
									{sprint.name}
								</option>
							{/each}
						</select>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.backlog-view {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.backlog-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0 4px;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.backlog-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-main);
		margin: 0;
	}

	.count-badge {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 2px 8px;
		background: var(--bg-surface-hover);
		color: var(--text-muted);
		border-radius: var(--radius-full);
	}

	.btn-create {
		font-size: 0.875rem;
		font-weight: 500;
		padding: 8px 16px;
		background: var(--brand-primary);
		color: var(--text-inverse);
		border-radius: var(--radius-md);
		transition: background-color 0.15s ease;
	}

	.btn-create:hover {
		background: var(--brand-hover);
	}

	.create-input-container {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px;
		background: var(--bg-surface);
		border: 1px solid var(--border-main);
		border-radius: var(--radius-md);
	}

	.create-input {
		width: 100%;
		padding: 10px 12px;
		font-size: 0.875rem;
		background: var(--bg-app);
		border: 1px solid var(--border-main);
		border-radius: var(--radius-md);
		color: var(--text-main);
	}

	.create-input:focus {
		border-color: var(--brand-primary);
	}

	.create-input::placeholder {
		color: var(--text-muted);
	}

	.create-actions {
		display: flex;
		gap: 8px;
	}

	.btn-submit {
		font-size: 0.8125rem;
		font-weight: 500;
		padding: 6px 14px;
		background: var(--brand-primary);
		color: var(--text-inverse);
		border-radius: var(--radius-sm);
		transition: background-color 0.15s ease;
	}

	.btn-submit:hover:not(:disabled) {
		background: var(--brand-hover);
	}

	.btn-submit:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-cancel {
		font-size: 0.8125rem;
		font-weight: 500;
		padding: 6px 14px;
		background: transparent;
		color: var(--text-muted);
		border: 1px solid var(--border-main);
		border-radius: var(--radius-sm);
		transition: all 0.15s ease;
	}

	.btn-cancel:hover {
		background: var(--bg-surface-hover);
		color: var(--text-main);
	}

	.loading-state,
	.empty-state {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 160px;
		color: var(--text-muted);
		font-size: 0.9375rem;
	}

	.task-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.task-card {
		display: flex;
		align-items: center;
		gap: 12px;
		background: var(--bg-surface);
		border: 1px solid var(--border-main);
		border-radius: var(--radius-md);
		padding: 12px 16px;
		cursor: pointer;
		transition: background-color 0.15s ease, border-color 0.15s ease;
	}

	.task-card:hover {
		background: var(--bg-surface-hover);
		border-color: var(--border-muted);
	}

	.task-main {
		display: flex;
		align-items: center;
		gap: 10px;
		flex: 1;
		min-width: 0;
	}

	.task-title {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-main);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.priority-badge {
		font-size: 0.625rem;
		font-weight: 600;
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		flex-shrink: 0;
	}

	.task-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}

	.due-date {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.status-badge {
		font-size: 0.625rem;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: var(--radius-sm);
		text-transform: capitalize;
	}

	.sprint-assign {
		flex-shrink: 0;
	}

	.sprint-select {
		font-size: 0.75rem;
		padding: 6px 10px;
		background: var(--bg-app);
		border: 1px solid var(--border-main);
		border-radius: var(--radius-sm);
		color: var(--text-main);
		min-width: 140px;
	}

	.sprint-select:focus {
		border-color: var(--brand-primary);
	}
</style>