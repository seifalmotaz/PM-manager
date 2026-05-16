<script lang="ts">
	import { Play } from 'lucide-svelte'
</script>

<div class="timer-bar" title="Start work session (coming soon)">
	<Play size={16} strokeWidth={2} />
	<span class="timer-label">Start session</span>
</div>

<style>
	.timer-bar {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		background: var(--bg-surface, #282828);
		border: 1px solid var(--border-main, #333333);
		border-radius: var(--radius-md, 5px);
		color: var(--text-muted, #808080);
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			color 0.15s ease;
	}

	.timer-bar:hover {
		background: var(--bg-surface-hover, #363636);
		color: var(--text-main, #ffffff);
	}

	.timer-label {
		line-height: 1;
	}
</style>