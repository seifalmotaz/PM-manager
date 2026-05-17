<script lang="ts">
	import type { Task } from '$lib/stores/task.svelte'
	import type { Sprint } from '$lib/stores/sprint.svelte'
	import ProjectTaskCard from '$lib/components/tasks/ProjectTaskCard.svelte'
	import QuickAddInput from './QuickAddInput.svelte'

	interface Props {
		title: string
		tasks: Task[]
		columnKey: string
		accentColor?: string
		showQuickAdd?: boolean
		mode?: 'status' | 'sprint'
		availableSprints?: Sprint[]
		onAddTask: (columnKey: string, title: string, extras?: { priority?: string; dueDate?: string; storyPoints?: number; assignee?: string }) => void
		onMoveTask: (taskId: string, targetColumnKey: string) => void
		onSelectTask: (taskId: string) => void
	}

	let {
		title,
		tasks,
		columnKey,
		accentColor,
		showQuickAdd = false,
		mode = 'status',
		availableSprints,
		onAddTask,
		onMoveTask,
		onSelectTask
	}: Props = $props()

	function getMoveOptions(currentStatus: Task['status']): Array<{ value: string; label: string }> {
		const transitions: Record<string, string[]> = {
			todo: ['in_progress'],
			in_progress: ['todo', 'done'],
			done: ['in_progress']
		}
		const targets = transitions[currentStatus] || []
		return targets.map(s => ({
			value: s,
			label: s === 'todo' ? 'To Do' : s === 'in_progress' ? 'In Progress' : 'Done'
		}))
	}
</script>

<div class="project-column">
	<div class="column-header">
		{#if accentColor}
			<div class="accent-dot" style="background: {accentColor}"></div>
		{/if}
		<span class="column-title">{title}</span>
		<span class="task-count">{tasks.length}</span>
	</div>

	<div class="task-list">
		{#each tasks as task (task.id)}
			<ProjectTaskCard
				{task}
				onClick={() => onSelectTask(task.id)}
				onMoveToStatus={getMoveOptions(task.status).length > 0
					? (status) => onMoveTask(task.id, status)
					: undefined}
				onMoveToSprint={mode === 'sprint' && availableSprints
					? (sprintId) => onMoveTask(task.id, sprintId ?? 'backlog')
					: undefined}
				availableSprints={mode === 'sprint' ? availableSprints : undefined}
			/>
		{/each}
	</div>

	{#if showQuickAdd}
		<div class="quick-add">
			<QuickAddInput
				placeholder="Add task..."
				onSubmit={(title, parsed) => {
					onAddTask(columnKey, title, {
						priority: parsed?.priority,
						dueDate: parsed?.dueDate,
						storyPoints: parsed?.storyPoints,
						assignee: parsed?.assignee
					})
				}}
			/>
		</div>
	{/if}
</div>

<style>
	.project-column {
		display: flex;
		flex-direction: column;
		background: var(--bg-surface);
		border: 1px solid var(--border-main);
		border-radius: var(--radius-lg);
		min-width: 280px;
		max-width: 400px;
		height: 100%;
		overflow: hidden;
	}

	.column-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 16px;
		border-bottom: 1px solid var(--border-muted);
	}

	.accent-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.column-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-main);
	}

	.task-count {
		font-size: 0.75rem;
		color: var(--text-muted);
		background: var(--bg-surface-hover);
		padding: 2px 8px;
		border-radius: 10px;
		margin-left: auto;
	}

	.task-list {
		flex: 1;
		overflow-y: auto;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.quick-add {
		padding: 12px;
		border-top: 1px solid var(--border-muted);
	}

	.quick-add-input {
		width: 100%;
		padding: 10px 12px;
		font-size: 0.875rem;
		background: var(--bg-app);
		border: 1px solid var(--border-main);
		border-radius: var(--radius-md);
		color: var(--text-main);
		transition: border-color 0.15s ease;
	}

	.quick-add-input:focus {
		border-color: var(--brand-primary);
	}

	.quick-add-input::placeholder {
		color: var(--text-muted);
	}
</style>