<script lang="ts">
	import { X } from 'lucide-svelte'
	import type { ProjectWithWorkspace } from '$lib/stores/project.svelte'

	const PROJECT_COLORS = [
		{ name: 'red',    hex: '#db4c3f' },
		{ name: 'orange', hex: '#ff9f43' },
		{ name: 'yellow', hex: '#feca57' },
		{ name: 'green',  hex: '#1dd1a1' },
		{ name: 'blue',   hex: '#54a0ff' },
		{ name: 'purple', hex: '#5f27cd' },
		{ name: 'pink',   hex: '#ff9ff3' },
		{ name: 'gray',   hex: '#8395a7' },
	]

	interface Props {
		isOpen: boolean
		isLoading: boolean
		project: ProjectWithWorkspace | null
		onClose: () => void
		onSubmit: (updates: { name: string; description: string; color: string | null }) => void
	}

	let { isOpen, isLoading, project, onClose, onSubmit }: Props = $props()

	let name = $state('')
	let description = $state('')
	let selectedColor = $state<string | null>(null)

	function handleSubmit(e: Event) {
		e.preventDefault()
		if (name.trim()) {
			onSubmit({ name: name.trim(), description: description.trim(), color: selectedColor })
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose()
		}
	}

	function toggleColor(color: string) {
		selectedColor = selectedColor === color ? null : color
	}

	let isUnchanged = $derived.by(() => {
		if (!project) return true
		return (
			name === project.name &&
			description === (project.description || '') &&
			selectedColor === project.color
		)
	})

	$effect(() => {
		if (isOpen && project) {
			name = project.name
			description = project.description || ''
			selectedColor = project.color
		}
	})

	$effect(() => {
		if (!isOpen) {
			name = ''
			description = ''
			selectedColor = null
		}
	})

	$effect(() => {
		function handleKeydown(e: KeyboardEvent) {
			if (e.key === 'Escape' && isOpen) {
				onClose()
			}
		}
		document.addEventListener('keydown', handleKeydown)
		return () => document.removeEventListener('keydown', handleKeydown)
	})
</script>

{#if isOpen}
	<div class="modal-overlay" onclick={handleBackdropClick} role="dialog" aria-modal="true">
		<div class="modal-card">
			<div class="modal-header">
				<h2 class="modal-title">Edit project</h2>
				<button class="close-button" onclick={onClose} aria-label="Close">
					<X size={20} />
				</button>
			</div>

			<form onsubmit={handleSubmit}>
				<div class="form-group">
					<label for="edit-project-name" class="form-label">Project name</label>
					<input
						id="edit-project-name"
						type="text"
						class="form-input"
						bind:value={name}
						placeholder="e.g., Website Redesign"
						required
						disabled={isLoading}
					/>
				</div>

				<div class="form-group">
					<label for="edit-project-description" class="form-label">Description (optional)</label>
					<input
						id="edit-project-description"
						type="text"
						class="form-input"
						bind:value={description}
						placeholder="Brief description of the project"
						disabled={isLoading}
					/>
				</div>

				<div class="form-group">
					<span class="form-label">Color</span>
					<div class="color-picker">
						{#each PROJECT_COLORS as c (c.name)}
							<button
								type="button"
								class="color-dot"
								class:selected={selectedColor === c.hex}
								style="background: {c.hex}; --dot-color: {c.hex}"
								onclick={() => toggleColor(c.hex)}
								aria-label="Select {c.name} color"
							/>
						{/each}
					</div>
				</div>

				<div class="form-actions">
					<button type="button" class="btn-cancel" onclick={onClose} disabled={isLoading}>
						Cancel
					</button>
					<button type="submit" class="btn-submit" disabled={!name.trim() || isLoading || isUnchanged}>
						{#if isLoading}
							Saving...
						{:else}
							Save changes
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.modal-card {
		background: var(--bg-surface);
		border-radius: var(--radius-lg);
		padding: 24px;
		width: 100%;
		max-width: 420px;
		margin: 16px;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
	}

	.modal-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-main);
		margin: 0;
	}

	.close-button {
		padding: 4px;
		border-radius: var(--radius-sm);
		color: var(--text-muted);
		transition: color 0.15s ease;
	}

	.close-button:hover {
		color: var(--text-main);
	}

	.form-group {
		margin-bottom: 20px;
	}

	.form-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-main);
		margin-bottom: 6px;
	}

	.form-input {
		width: 100%;
		padding: 10px 12px;
		border: 1px solid var(--border-main);
		border-radius: var(--radius-md);
		background: var(--bg-app);
		color: var(--text-main);
		font-size: 0.9375rem;
		transition: border-color 0.15s ease;
	}

	.form-input:focus {
		border-color: var(--brand-primary);
	}

	.form-input::placeholder {
		color: var(--text-muted);
	}

	.form-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.color-picker {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.color-dot {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		cursor: pointer;
		transition: transform 0.15s ease, box-shadow 0.15s ease;
		border: none;
		padding: 0;
	}

	.color-dot:hover {
		transform: scale(1.1);
	}

	.color-dot.selected {
		transform: scale(1.15);
		box-shadow: 0 0 0 2px var(--bg-app), 0 0 0 4px var(--dot-color);
	}

	.form-actions {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
	}

	.btn-cancel {
		padding: 10px 16px;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-muted);
		border-radius: var(--radius-md);
		transition: color 0.15s ease;
	}

	.btn-cancel:hover:not(:disabled) {
		color: var(--text-main);
	}

	.btn-cancel:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-submit {
		padding: 10px 20px;
		font-size: 0.875rem;
		font-weight: 500;
		background: var(--brand-primary);
		color: var(--text-inverse);
		border-radius: var(--radius-md);
		transition: background-color 0.15s ease;
	}

	.btn-submit:hover:not(:disabled) {
		background: var(--brand-hover);
	}

	.btn-submit:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
