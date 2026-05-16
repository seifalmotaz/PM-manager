<script lang="ts">
	import { toast } from '$lib/stores/toast.svelte'

	const typeColors: Record<string, string> = {
		info: 'var(--text-main)',
		success: '#4caf50',
		error: '#f44336',
		warning: '#ff9800'
	}

	// Safe access for SSR
	const toasts = $derived(toast?.toasts ?? [])
</script>

{#if toasts.length > 0}
	<div class="toast-container">
		{#each toasts as t (t.id)}
			<div class="toast toast-{t.type}">
				<span class="toast-message" style="color: {typeColors[t.type]}">
					{t.message}
				</span>
				<button
					class="toast-dismiss"
					onclick={() => toast.dismiss(t.id)}
					aria-label="Dismiss"
				>
					×
				</button>
			</div>
		{/each}
	</div>
{/if}

<style>
	.toast-container {
		position: fixed;
		bottom: 1rem;
		right: 1rem;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.toast {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: var(--bg-surface);
		border: 1px solid var(--border-main);
		border-radius: var(--radius-md);
		min-width: 280px;
		max-width: 400px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.toast-message {
		flex: 1;
		font-size: 0.875rem;
	}

	.toast-dismiss {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: var(--radius-sm);
		color: var(--text-muted);
		font-size: 1.25rem;
		line-height: 1;
		transition: background-color 0.15s ease;
	}

	.toast-dismiss:hover {
		background: var(--bg-surface-hover);
		color: var(--text-main);
	}
</style>