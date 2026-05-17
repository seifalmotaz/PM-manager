<script lang="ts">
	import { Pencil } from 'lucide-svelte'
	import type { Workspace } from '$lib/stores/workspace.svelte'

	interface Props {
		workspace: Workspace
		onEdit?: (workspace: Workspace) => void
	}

	let { workspace, onEdit }: Props = $props()

	function handleEdit() {
		onEdit?.(workspace)
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString()
	}
</script>

<div class="workspace-card">
	<div class="card-header">
		<h3 class="workspace-name">{workspace.name}</h3>
		<button class="edit-button" onclick={handleEdit} aria-label="Edit workspace">
			<Pencil size={16} />
		</button>
	</div>

	<div class="card-body">
		<span class="type-badge" class:personal={workspace.type === 'personal'} class:company={workspace.type === 'company'}>
			{workspace.type}
		</span>

		<div class="meta-item">
			<span class="meta-label">Users</span>
			<span class="meta-value">{workspace.memberCount} members</span>
		</div>

		<div class="meta-item">
			<span class="meta-label">Created</span>
			<span class="meta-value">{formatDate(workspace.createdAt)}</span>
		</div>
	</div>
</div>

<style>
	.workspace-card {
		background: var(--bg-surface);
		border: 1px solid var(--border-main);
		border-radius: var(--radius-lg);
		padding: 16px;
		transition: background-color 0.15s ease, box-shadow 0.15s ease;
	}

	.workspace-card:hover {
		background: var(--bg-surface-hover);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 12px;
	}

	.workspace-name {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-main);
		margin: 0;
	}

	.edit-button {
		opacity: 0;
		padding: 4px;
		border-radius: var(--radius-sm);
		color: var(--text-muted);
		transition: opacity 0.15s ease, color 0.15s ease;
	}

	.workspace-card:hover .edit-button {
		opacity: 1;
	}

	.edit-button:hover {
		color: var(--text-main);
		background: var(--bg-surface-hover);
	}

	.card-body {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.type-badge {
		display: inline-block;
		padding: 2px 8px;
		font-size: 0.75rem;
		border-radius: 12px;
		text-transform: capitalize;
		width: fit-content;
	}

	.type-badge.personal {
		background: var(--text-muted);
		color: var(--bg-surface);
	}

	.type-badge.company {
		background: var(--brand-primary);
		color: var(--text-inverse);
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.875rem;
	}

	.meta-label {
		color: var(--text-muted);
	}

	.meta-value {
		color: var(--text-main);
	}
</style>