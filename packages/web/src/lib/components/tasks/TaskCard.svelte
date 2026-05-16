<script lang="ts">
	import { Folder, Calendar } from 'lucide-svelte'

	interface Props {
		title: string
		priority: 'P0' | 'P1' | 'P2' | 'P3'
		project: string
		dueDate: string
		overdue?: boolean
	}

	let { title, priority, project, dueDate, overdue = false }: Props = $props()

	const priorityColors: Record<string, { bg: string; text: string }> = {
		P0: { bg: '#f44336', text: '#ffffff' },
		P1: { bg: '#ff9800', text: '#000000' },
		P2: { bg: '#ffeb3b', text: '#000000' },
		P3: { bg: '#9e9e9e', text: '#ffffff' }
	}
</script>

<div class="task-card" class:overdue>
	<div class="card-header">
		<h3 class="task-title">{title}</h3>
		<span
			class="priority-badge"
			style="background-color: {priorityColors[priority].bg}; color: {priorityColors[priority].text}"
		>
			{priority}
		</span>
	</div>

	<div class="card-meta">
		<div class="meta-item">
			<Folder size={12} strokeWidth={2} />
			<span>{project}</span>
		</div>
		<div class="meta-item" class:overdue-date={overdue}>
			<Calendar size={12} strokeWidth={2} />
			<span>{dueDate}</span>
		</div>
	</div>
</div>

<style>
	.task-card {
		background: var(--bg-surface);
		border: 1px solid var(--border-main);
		border-radius: var(--radius-md);
		padding: 12px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
		transition: background-color 0.15s ease;
	}

	.task-card:hover {
		background: var(--bg-surface-hover);
	}

	.task-card.overdue {
		border-left: 3px solid #f44336;
		background: rgba(244, 67, 54, 0.08);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 8px;
		margin-bottom: 8px;
	}

	.task-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-main);
		line-height: 1.4;
		flex: 1;
	}

	.priority-badge {
		font-size: 10px;
		font-weight: 600;
		padding: 2px 6px;
		border-radius: 4px;
		text-transform: uppercase;
		letter-spacing: 0.3px;
		flex-shrink: 0;
	}

	.card-meta {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		color: var(--text-muted);
	}

	.meta-item.overdue-date {
		color: #f44336;
	}
</style>