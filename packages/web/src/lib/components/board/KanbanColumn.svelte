<script lang="ts">
	import { Plus } from 'lucide-svelte'
	import TaskCard from '$lib/components/tasks/TaskCard.svelte'

	interface TaskItem {
		id: string
		title: string
		priority: 'P0' | 'P1' | 'P2' | 'P3'
		project: string
		dueDate: string
		overdue?: boolean
	}

	interface Props {
		title: string
		tasks: TaskItem[]
		accentColor?: string
	}

	let { title, tasks, accentColor }: Props = $props()
</script>

<div class="kanban-column">
	<header class="column-header">
		<div class="header-left">
			{#if accentColor}
				<span class="accent-dot" style="background-color: {accentColor}"></span>
			{/if}
			<h2 class="column-title">{title}</h2>
			<span class="task-count">{tasks.length}</span>
		</div>
	</header>

	<div class="task-list">
		{#each tasks as task (task.id)}
			<TaskCard
				title={task.title}
				priority={task.priority}
				project={task.project}
				dueDate={task.dueDate}
				overdue={task.overdue}
			/>
		{/each}
	</div>

	<button class="add-task-btn">
		<Plus size={16} strokeWidth={2} />
		<span>Add task</span>
	</button>
</div>

<style>
	.kanban-column {
		background: rgba(0, 0, 0, 0.15);
		border-radius: var(--radius-lg);
		padding: 12px;
		display: flex;
		flex-direction: column;
		min-height: 0;
		flex: 1;
	}

	.column-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
		padding: 0 4px;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.accent-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.column-title {
		font-size: 14px;
		font-weight: 700;
		color: var(--text-main);
	}

	.task-count {
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted);
		background: rgba(255, 255, 255, 0.1);
		padding: 2px 6px;
		border-radius: 10px;
		min-width: 20px;
		text-align: center;
	}

	.task-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		flex: 1;
		overflow-y: auto;
		min-height: 100px;
	}

	.add-task-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 10px;
		margin-top: 12px;
		border: 1px dashed var(--border-main);
		border-radius: var(--radius-md);
		color: var(--text-muted);
		font-size: 13px;
		font-weight: 500;
		transition: all 0.15s ease;
		width: 100%;
	}

	.add-task-btn:hover {
		border-color: var(--text-muted);
		color: var(--text-main);
		background: rgba(255, 255, 255, 0.03);
	}
</style>