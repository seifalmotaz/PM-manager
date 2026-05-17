<script lang="ts">
	import type { Task } from '$lib/stores/task.svelte'
	import type { Sprint } from '$lib/stores/sprint.svelte'
	import { Folder } from 'lucide-svelte'

	interface Props {
		task: Task
		onClick: () => void
		onMoveToStatus?: (status: 'todo' | 'in_progress' | 'done') => void
		onMoveToSprint?: (sprintId: string | null) => void
		availableSprints?: Sprint[]
	}

	let { task, onClick, onMoveToStatus, onMoveToSprint, availableSprints }: Props = $props()

	const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
		p0: { bg: '#f44336', text: '#fff' },
		p1: { bg: '#ff9800', text: '#000' },
		p2: { bg: '#ffeb3b', text: '#000' },
		p3: { bg: '#9e9e9e', text: '#fff' }
	}

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

	function handleSprintChange(e: Event) {
		const select = e.target as HTMLSelectElement
		const value = select.value
		if (onMoveToSprint) {
			onMoveToSprint(value === '' ? null : value)
		}
	}

	function handleCardClick(e: MouseEvent) {
		const target = e.target as HTMLElement
		if (target.tagName === 'SELECT' || target.tagName === 'BUTTON') {
			return
		}
		onClick()
	}
</script>

<div class="task-card" onclick={handleCardClick} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && onClick()}>
	<div class="task-header">
		<span class="task-title">{task.title}</span>
		{#if task.priority}
			{@const colors = PRIORITY_COLORS[task.priority]}
			<span
				class="priority-badge"
				style="background: {colors.bg}; color: {colors.text}"
			>
				{task.priority.toUpperCase()}
			</span>
		{/if}
	</div>

	{#if task.project}
		<div class="task-project">
			<Folder size={12} strokeWidth={2} />
			<span>{task.project.name}</span>
		</div>
	{/if}

	{#if task.dueDate}
		<div class="task-meta">
			<span class="due-date">{formatDueDate(task.dueDate)}</span>
		</div>
	{/if}

	{#if onMoveToStatus || onMoveToSprint}
		<div class="task-actions">
			{#if onMoveToStatus}
				{#if task.status === 'todo'}
					<button class="move-btn" onclick={() => onMoveToStatus?.('in_progress')}>
						→ In Progress
					</button>
				{:else if task.status === 'in_progress'}
					<button class="move-btn" onclick={() => onMoveToStatus?.('todo')}>
						→ To Do
					</button>
					<button class="move-btn" onclick={() => onMoveToStatus?.('done')}>
						→ Done
					</button>
				{:else if task.status === 'done'}
					<button class="move-btn" onclick={() => onMoveToStatus?.('in_progress')}>
						→ In Progress
					</button>
				{/if}
			{/if}

			{#if onMoveToSprint && availableSprints}
				<select class="sprint-select" onchange={handleSprintChange}>
					<option value="">Backlog</option>
					{#each availableSprints as sprint}
						<option value={sprint.id} selected={sprint.id === task.sprintId}>
							{sprint.name}
						</option>
					{/each}
				</select>
			{/if}
		</div>
	{/if}
</div>

<style>
	.task-card {
		background: var(--bg-surface);
		border: 1px solid var(--border-main);
		border-radius: var(--radius-md);
		padding: 12px;
		cursor: pointer;
		transition: background-color 0.15s ease, border-color 0.15s ease;
	}

	.task-card:hover {
		background: var(--bg-surface-hover);
		border-color: var(--border-muted);
	}

	.task-header {
		display: flex;
		align-items: flex-start;
		gap: 8px;
	}

	.task-title {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-main);
		flex: 1;
		line-height: 1.4;
	}

	.priority-badge {
		font-size: 0.625rem;
		font-weight: 600;
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		flex-shrink: 0;
	}

	.task-meta {
		margin-top: 8px;
	}

	.due-date {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.task-project {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-top: 6px;
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.task-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 10px;
		padding-top: 10px;
		border-top: 1px solid var(--border-muted);
	}

	.move-btn {
		font-size: 0.75rem;
		padding: 4px 8px;
		background: var(--bg-app);
		border: 1px solid var(--border-main);
		border-radius: var(--radius-sm);
		color: var(--text-muted);
		transition: all 0.15s ease;
	}

	.move-btn:hover {
		background: var(--bg-surface-hover);
		color: var(--text-main);
		border-color: var(--brand-primary);
	}

	.sprint-select {
		font-size: 0.75rem;
		padding: 4px 8px;
		background: var(--bg-app);
		border: 1px solid var(--border-main);
		border-radius: var(--radius-sm);
		color: var(--text-main);
		max-width: 120px;
	}

	.sprint-select:focus {
		border-color: var(--brand-primary);
	}
</style>