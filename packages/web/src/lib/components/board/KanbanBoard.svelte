<script lang="ts">
	import KanbanColumn from './KanbanColumn.svelte'
	import type { Task } from '$lib/stores/task.svelte'

	interface Props {
		tasks: Task[]
		onSelectTask: (taskId: string) => void
		onMoveTask: (taskId: string, targetStatus: 'todo' | 'in_progress' | 'done') => void
	}

	let { tasks, onSelectTask, onMoveTask }: Props = $props()

	let todoTasks = $derived(tasks.filter(t => t.status === 'todo'))
	let inProgressTasks = $derived(tasks.filter(t => t.status === 'in_progress'))
	let doneTasks = $derived(tasks.filter(t => t.status === 'done'))
</script>

<div class="kanban-board">
	<KanbanColumn title="To Do" tasks={todoTasks} accentColor="#808080" showAddButton={false} {onSelectTask} {onMoveTask} />
	<KanbanColumn title="In Progress" tasks={inProgressTasks} accentColor="#db4c3f" showAddButton={false} {onSelectTask} {onMoveTask} />
	<KanbanColumn title="Done" tasks={doneTasks} accentColor="#4caf50" showAddButton={false} {onSelectTask} {onMoveTask} />
</div>

<style>
	.kanban-board {
		display: flex;
		gap: 16px;
		padding: 16px;
		height: 100%;
		width: 100%;
		overflow-x: auto;
		box-sizing: border-box;
	}

	.kanban-board :global(.kanban-column) {
		min-width: 280px;
		max-width: 400px;
	}
</style>
