<script lang="ts">
	import KanbanColumn from './KanbanColumn.svelte'

	interface TaskItem {
		id: string
		title: string
		priority: 'P0' | 'P1' | 'P2' | 'P3'
		project: string
		dueDate: string
		overdue?: boolean
	}

	const todoTasks: TaskItem[] = [
		{ id: '1', title: 'Fix login bug', priority: 'P1', project: 'Backend', dueDate: 'Today' },
		{ id: '2', title: 'Write API spec', priority: 'P2', project: 'Backend', dueDate: 'Tomorrow' },
		{ id: '3', title: 'Update dependencies', priority: 'P3', project: 'DevOps', dueDate: 'Today' },
		{ id: '4', title: 'Document onboarding', priority: 'P3', project: 'Docs', dueDate: 'Next week' }
	]

	const inProgressTasks: TaskItem[] = [
		{ id: '5', title: 'Sprint planning', priority: 'P2', project: 'Backend', dueDate: 'Friday' },
		{ id: '6', title: 'Code review: auth PR', priority: 'P1', project: 'Backend', dueDate: 'Today' }
	]

	const doneTasks: TaskItem[] = [
		{ id: '7', title: 'Deploy to staging', priority: 'P0', project: 'DevOps', dueDate: 'Today' },
		{ id: '8', title: 'Design review', priority: 'P0', project: 'Frontend', dueDate: 'Yesterday', overdue: true }
	]
</script>

<div class="kanban-board">
	<KanbanColumn title="To Do" tasks={todoTasks} accentColor="#808080" />
	<KanbanColumn title="In Progress" tasks={inProgressTasks} accentColor="#db4c3f" />
	<KanbanColumn title="Done" tasks={doneTasks} accentColor="#4caf50" />
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