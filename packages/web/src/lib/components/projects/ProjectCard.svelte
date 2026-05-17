<script lang="ts">
	import { goto } from '$app/navigation'
	import { Pencil, Trash2 } from 'lucide-svelte'
	import type { ProjectWithWorkspace } from '$lib/stores/project.svelte'

	interface Props {
		project: ProjectWithWorkspace
		onEdit?: (project: ProjectWithWorkspace) => void
		onDelete?: (project: ProjectWithWorkspace) => void
	}

	let { project, onEdit, onDelete }: Props = $props()

	function handleNavigate() {
		goto('/projects/' + project.id)
	}

	function handleEdit(e: MouseEvent) {
		e.stopPropagation()
		onEdit?.(project)
	}

	function handleDelete(e: MouseEvent) {
		e.stopPropagation()
		onDelete?.(project)
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString()
	}
</script>

<div class="project-card" onclick={handleNavigate} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && handleNavigate()}>
	<div class="card-header">
		<div class="project-name-row">
			<div class="color-dot" style="background: {project.color || 'var(--text-muted)'}"></div>
			<h3 class="project-name">{project.name}</h3>
		</div>
		<div class="action-buttons">
			<button class="action-button edit" onclick={handleEdit} aria-label="Edit project">
				<Pencil size={16} />
			</button>
			<button class="action-button delete" onclick={handleDelete} aria-label="Delete project">
				<Trash2 size={16} />
			</button>
		</div>
	</div>

	<div class="card-body">
		<span class="workspace-label">in {project.workspaceName || 'Unknown workspace'}</span>
		{#if project.description}
			<p class="project-description">{project.description}</p>
		{/if}
		<span class="created-date">Created {formatDate(project.createdAt)}</span>
	</div>
</div>

<style>
	.project-card {
		background: var(--bg-surface);
		border: 1px solid var(--border-main);
		border-radius: var(--radius-lg);
		padding: 16px;
		transition: background-color 0.15s ease, box-shadow 0.15s ease;
	}

	.project-card:hover {
		background: var(--bg-surface-hover);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.project-name-row {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.color-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.project-name {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-main);
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.action-buttons {
		display: flex;
		gap: 2px;
		opacity: 0;
		transition: opacity 0.15s ease;
		flex-shrink: 0;
	}

	.project-card:hover .action-buttons {
		opacity: 1;
	}

	.action-button {
		padding: 4px;
		border-radius: var(--radius-sm);
		color: var(--text-muted);
		transition: color 0.15s ease, background-color 0.15s ease;
	}

	.action-button:hover {
		color: var(--text-main);
		background: var(--bg-surface-hover);
	}

	.action-button.delete:hover {
		color: var(--brand-primary);
	}

	.card-body {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 12px;
	}

	.workspace-label {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.project-description {
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin: 0;
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	.created-date {
		font-size: 0.75rem;
		color: var(--text-muted);
	}
</style>
