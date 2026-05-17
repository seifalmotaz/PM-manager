<script lang="ts">
	import { X } from 'lucide-svelte'
	import type { CreateSprintInput } from '$lib/stores/sprint.svelte'

	interface Props {
		isOpen: boolean
		projectId: string
		isLoading: boolean
		onClose: () => void
		onSubmit: (input: CreateSprintInput) => void
	}

	let { isOpen, projectId, isLoading, onClose, onSubmit }: Props = $props()

	let name = $state('')
	let goal = $state('')
	let startDate = $state('')
	let endDate = $state('')
	let error = $state<string | null>(null)

	function getToday(): string {
		return new Date().toISOString().split('T')[0]
	}

	function getDefaultEndDate(): string {
		const date = new Date()
		date.setDate(date.getDate() + 14)
		return date.toISOString().split('T')[0]
	}

	function resetForm() {
		name = ''
		goal = ''
		startDate = getToday()
		endDate = getDefaultEndDate()
		error = null
	}

	let isValid = $derived.by(() => {
		if (!name.trim()) return false
		if (!startDate) return false
		if (endDate && startDate && endDate < startDate) return false
		return true
	})

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose()
		}
	}

	function handleSubmit() {
		if (!isValid || isLoading) return

		if (endDate && startDate && endDate < startDate) {
			error = 'End date must be after start date'
			return
		}

		error = null
		onSubmit({
			projectId,
			name: name.trim(),
			goal: goal.trim() || undefined,
			startDate: startDate + 'T00:00:00Z',
			endDate: endDate ? endDate + 'T00:00:00Z' : undefined
		})
	}

	function handleCancel() {
		onClose()
	}

	$effect(() => {
		if (isOpen) {
			resetForm()
		}
	})

	$effect(() => {
		if (!isOpen) return
		function handleKeydown(e: KeyboardEvent) {
			if (e.key === 'Escape') {
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
				<h2 class="modal-title">Create New Sprint</h2>
				<button class="close-button" onclick={onClose} aria-label="Close">
					<X size={20} />
				</button>
			</div>

			<div class="modal-body">
				{#if error}
					<div class="error-banner">
						<p class="error-message">{error}</p>
					</div>
				{/if}

				<div class="form-group">
					<label class="form-label" for="sprint-name">Sprint Name <span class="required">*</span></label>
					<input
						id="sprint-name"
						type="text"
						class="form-input"
						bind:value={name}
						placeholder="e.g., Sprint 1"
						disabled={isLoading}
					/>
				</div>

				<div class="form-group">
					<label class="form-label" for="sprint-goal">Goal</label>
					<input
						id="sprint-goal"
						type="text"
						class="form-input"
						bind:value={goal}
						placeholder="What will this sprint accomplish?"
						disabled={isLoading}
					/>
				</div>

				<div class="form-row">
					<div class="form-group">
						<label class="form-label" for="sprint-start">Start Date <span class="required">*</span></label>
						<input
							id="sprint-start"
							type="date"
							class="form-input"
							bind:value={startDate}
							disabled={isLoading}
						/>
					</div>

					<div class="form-group">
						<label class="form-label" for="sprint-end">End Date</label>
						<input
							id="sprint-end"
							type="date"
							class="form-input"
							bind:value={endDate}
							disabled={isLoading}
						/>
					</div>
				</div>
			</div>

			<div class="modal-footer">
				<button class="btn-cancel" onclick={handleCancel} disabled={isLoading}>
					Cancel
				</button>
				<button class="btn-submit" onclick={handleSubmit} disabled={!isValid || isLoading}>
					{#if isLoading}
						Creating...
					{:else}
						Create Sprint
					{/if}
				</button>
			</div>
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
		z-index: 50;
	}

	.modal-card {
		background: var(--bg-surface);
		border-radius: var(--radius-lg);
		width: 100%;
		max-width: 480px;
		margin: 16px;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 20px;
		border-bottom: 1px solid var(--border-muted);
	}

	.modal-title {
		font-size: 1rem;
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

	.modal-body {
		padding: 20px;
	}

	.error-banner {
		padding: 12px;
		margin-bottom: 16px;
		background: rgba(219, 76, 63, 0.1);
		border: 1px solid rgba(219, 76, 63, 0.3);
		border-radius: var(--radius-md);
	}

	.error-message {
		font-size: 0.875rem;
		color: #db4c3f;
		margin: 0;
	}

	.form-group {
		margin-bottom: 16px;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	.form-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-main);
		margin-bottom: 6px;
	}

	.required {
		color: #db4c3f;
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

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		padding: 16px 20px;
		border-top: 1px solid var(--border-muted);
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