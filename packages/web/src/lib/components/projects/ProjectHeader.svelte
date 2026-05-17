<script lang="ts">
	import { Plus } from 'lucide-svelte'

	interface Props {
		project: { name: string; description: string | null; color: string | null } | null
		activeTab: 'board' | 'backlog'
		boardMode: 'status' | 'sprint'
		isLoading: boolean
		onTabChange: (tab: 'board' | 'backlog') => void
		onBoardModeChange: (mode: 'status' | 'sprint') => void
		onNewSprint: () => void
	}

	let { project, activeTab, boardMode, isLoading, onTabChange, onBoardModeChange, onNewSprint }: Props = $props()
</script>

<header class="project-header">
	{#if isLoading && !project}
		<div class="header-skeleton">
			<div class="skeleton-line w-48"></div>
			<div class="skeleton-line w-32"></div>
		</div>
	{:else if project}
		<div class="header-top">
			<div class="project-title-row">
				{#if project.color}
					<div class="color-dot" style="background: {project.color}"></div>
				{/if}
				<h1 class="project-name">{project.name}</h1>
			</div>
			{#if project.description}
				<p class="project-description">{project.description}</p>
			{/if}
		</div>

		<div class="header-controls">
			<div class="tab-group">
				<button
					class="tab-button"
					class:active={activeTab === 'board'}
					onclick={() => onTabChange('board')}
				>
					Board
				</button>
				<button
					class="tab-button"
					class:active={activeTab === 'backlog'}
					onclick={() => onTabChange('backlog')}
				>
					Backlog
				</button>
			</div>

			{#if activeTab === 'board'}
				<div class="mode-toggle">
					<button
						class="mode-button"
						class:active={boardMode === 'status'}
						onclick={() => onBoardModeChange('status')}
					>
						By Status
					</button>
					<button
						class="mode-button"
						class:active={boardMode === 'sprint'}
						onclick={() => onBoardModeChange('sprint')}
					>
						By Sprint
					</button>
				</div>

				<button class="btn-new-sprint" onclick={onNewSprint}>
					<Plus size={16} />
					<span>New Sprint</span>
				</button>
			{/if}
		</div>
	{/if}
</header>

<style>
	.project-header {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-bottom: 24px;
	}

	.header-skeleton {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.skeleton-line {
		height: 16px;
		background: var(--bg-surface-hover);
		border-radius: var(--radius-sm);
		animation: pulse 1.5s ease-in-out infinite;
	}

	.skeleton-line.w-48 {
		width: 48%;
	}

	.skeleton-line.w-32 {
		width: 32%;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.header-top {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.project-title-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.color-dot {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.project-name {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-main);
		margin: 0;
	}

	.project-description {
		font-size: 0.875rem;
		color: var(--text-muted);
		margin: 0;
		margin-left: 24px;
	}

	.header-controls {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-top: 8px;
	}

	.tab-group {
		display: flex;
		gap: 4px;
		background: var(--bg-surface);
		border-radius: var(--radius-md);
		padding: 4px;
	}

	.tab-button {
		padding: 8px 16px;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-muted);
		border-radius: var(--radius-sm);
		transition: all 0.15s ease;
	}

	.tab-button:hover {
		color: var(--text-main);
	}

	.tab-button.active {
		background: var(--bg-surface-hover);
		color: var(--text-main);
	}

	.mode-toggle {
		display: flex;
		gap: 4px;
		background: var(--bg-surface);
		border-radius: var(--radius-md);
		padding: 4px;
	}

	.mode-button {
		padding: 6px 12px;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-muted);
		border-radius: var(--radius-sm);
		transition: all 0.15s ease;
	}

	.mode-button:hover {
		color: var(--text-main);
	}

	.mode-button.active {
		background: var(--brand-primary);
		color: var(--text-inverse);
	}

	.btn-new-sprint {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		font-size: 0.875rem;
		font-weight: 500;
		background: var(--brand-primary);
		color: var(--text-inverse);
		border-radius: var(--radius-md);
		transition: background-color 0.15s ease;
		margin-left: auto;
	}

	.btn-new-sprint:hover {
		background: var(--brand-hover);
	}
</style>