<script lang="ts">
	import type { Task } from '$lib/stores/task.svelte'
	import type { Sprint } from '$lib/stores/sprint.svelte'
	import ProjectColumn from './ProjectColumn.svelte'

	interface Props {
		tasks: Task[]
		sprints: Sprint[]
		mode: 'status' | 'sprint'
		onAddTask: (columnKey: string, title: string, extras?: { priority?: string; dueDate?: string; storyPoints?: number; assignee?: string }) => void
		onMoveTask: (taskId: string, targetColumnKey: string) => void
		onSelectTask: (taskId: string) => void
	}

	let { tasks, sprints, mode, onAddTask, onMoveTask, onSelectTask }: Props = $props()

	const STATUS_COLUMNS = [
		{ key: 'todo', title: 'To Do', color: '#808080' },
		{ key: 'in_progress', title: 'In Progress', color: '#db4c3f' },
		{ key: 'done', title: 'Done', color: '#4caf50' }
	] as const

	let columns = $derived.by(() => {
		if (mode === 'status') {
			return STATUS_COLUMNS.map(col => ({
				key: col.key as string,
				title: col.title,
				accentColor: col.color,
				tasks: tasks.filter(t => t.status === col.key)
			}))
		} else {
			// Sprint mode: sorted by startDate, backlog at end
			const sortedSprints = [...sprints].sort((a, b) =>
				new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
			)

			const sprintColumns = sortedSprints.map(s => ({
				key: s.id,
				title: s.name,
				accentColor: undefined,
				tasks: tasks.filter(t => t.sprintId === s.id)
			}))

			const backlogColumn = {
				key: 'backlog',
				title: 'Backlog',
				accentColor: undefined,
				tasks: tasks.filter(t => t.sprintId === null)
			}

			return [...sprintColumns, backlogColumn]
		}
	})
</script>

<div class="project-board">
	{#each columns as column (column.key)}
		<ProjectColumn
			title={column.title}
			tasks={column.tasks}
			columnKey={column.key}
			accentColor={column.accentColor}
			showQuickAdd={mode === 'sprint' || (mode === 'status' && column.key === 'todo')}
			{mode}
			availableSprints={sprints}
			{onAddTask}
			{onMoveTask}
			{onSelectTask}
		/>
	{/each}
</div>

<style>
	.project-board {
		display: flex;
		gap: 16px;
		overflow-x: auto;
		height: calc(100% - 120px);
		padding-bottom: 16px;
	}

	.project-board :global(.project-column) {
		min-width: 280px;
		max-width: 400px;
		flex-shrink: 0;
	}
</style>