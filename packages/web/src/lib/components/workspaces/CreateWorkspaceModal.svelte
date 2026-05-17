<script lang="ts">
	import { X } from 'lucide-svelte'

	interface Props {
		isOpen: boolean
		isLoading: boolean
		onClose: () => void
		onSubmit: (name: string) => void
	}

	let { isOpen, isLoading, onClose, onSubmit }: Props = $props()

	let name = $state('')

	function handleSubmit(e: Event) {
		e.preventDefault()
		if (name.trim()) {
			onSubmit(name.trim())
			name = ''
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose()
		}
	}

	$effect(() => {
		if (!isOpen) {
			name = ''
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
				<h2 class="modal-title">Create workspace</h2>
				<button class="close-button" onclick={onClose} aria-label="Close">
					<X size={20} />
				</button>
			</div>

			<form onsubmit={handleSubmit}>
				<div class="form-group">
					<label for="workspace-name" class="form-label">Workspace name</label>
					<input
						id="workspace-name"
						type="text"
						class="form-input"
						bind:value={name}
						placeholder="e.g., Engineering Team"
						disabled={isLoading}
					/>
				</div>

				<div class="form-actions">
					<button type="button" class="btn-cancel" onclick={onClose} disabled={isLoading}>
						Cancel
					</button>
					<button type="submit" class="btn-submit" disabled={!name.trim() || isLoading}>
						{#if isLoading}
							Creating...
						{:else}
							Create workspace
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