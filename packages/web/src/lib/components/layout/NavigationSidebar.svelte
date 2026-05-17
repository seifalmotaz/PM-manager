<script lang="ts">
	import { Home, BarChart3, Folder, Plus, ArrowRight } from 'lucide-svelte'
	import { goto } from '$app/navigation'
	import { organization } from '$lib/stores/organization.svelte'
	import { workspace } from '$lib/stores/workspace.svelte'
	import type { Snippet } from 'svelte'

	let { children, bottom }: { children?: Snippet; bottom?: Snippet } = $props()

	const navItems = [
		{ id: 'home', label: 'Home', icon: Home },
		{ id: 'velocity', label: 'Velocity', icon: BarChart3 },
		{ id: 'projects', label: 'Projects', icon: Folder }
	]

	let activeNav = $state('home')

	function handleNavClick(id: string) {
		activeNav = id
	}

	let activeOrg = $derived(organization.activeOrganization)
	let isAdmin = $derived(activeOrg ? organization.isOrgAdmin(activeOrg.id) : false)
</script>

<aside class="nav-sidebar">
	<div class="nav-header">
		<span class="org-name">
			{organization.activeOrganization?.name ?? 'Select an org'}
		</span>
	</div>

	<nav class="nav-list">
		{#each navItems as item (item.id)}
			<button
				class="nav-item"
				class:active={activeNav === item.id}
				onclick={() => handleNavClick(item.id)}
			>
				<svelte:component this={item.icon} size={18} strokeWidth={2} />
				<span class="nav-label">{item.label}</span>
			</button>
		{/each}
	</nav>

	<div class="nav-separator"></div>

	<div class="nav-section">
		<div class="section-header">
			<span class="section-title">Workspaces</span>
			{#if isAdmin}
				<button class="add-btn" onclick={() => workspace.openCreateModal()} title="Create workspace">
					<Plus size={14} strokeWidth={2} />
				</button>
			{/if}
		</div>
		<button class="nav-item" onclick={() => goto('/workspaces')}>
			<ArrowRight size={16} strokeWidth={2} />
			<span class="nav-label">Manage workspaces</span>
		</button>
	</div>

	<div class="nav-section">
		<span class="section-title">Projects</span>
		<span class="section-hint">Coming soon</span>
	</div>

	<div class="nav-bottom">
		<slot name="bottom" />
	</div>
</aside>

<style>
	.nav-sidebar {
		width: 240px;
		min-width: 240px;
		height: 100%;
		background: var(--bg-sidebar, #282828);
		border-right: 1px solid var(--border-main, #333333);
		display: flex;
		flex-direction: column;
		padding: 12px 8px;
	}

	.nav-header {
		padding: 8px 12px;
		margin-bottom: 8px;
	}

	.org-name {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-muted, #808080);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.nav-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 12px;
		border-radius: var(--radius-md, 5px);
		color: var(--text-main, #ffffff);
		font-size: 14px;
		transition: background-color 0.15s ease;
		width: 100%;
		text-align: left;
	}

	.nav-item:hover {
		background: var(--bg-surface-hover, #363636);
	}

	.nav-item.active {
		background: var(--bg-surface-hover, #363636);
		position: relative;
	}

	.nav-item.active::before {
		content: '';
		position: absolute;
		left: 0;
		top: 6px;
		bottom: 6px;
		width: 3px;
		background: var(--brand-primary, #db4c3f);
		border-radius: 0 2px 2px 0;
	}

	.nav-label {
		font-weight: 500;
	}

	.nav-separator {
		height: 1px;
		background: var(--border-muted, #2a2a2a);
		margin: 12px 12px;
	}

	.nav-section {
		padding: 8px 12px;
	}

	.section-title {
		display: block;
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted, #808080);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 4px;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-right: 2px;
	}

	.section-header .section-title {
		margin-bottom: 0;
	}

	.add-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border-radius: var(--radius-sm, 4px);
		color: var(--text-muted, #808080);
		transition: color 0.15s ease, background-color 0.15s ease;
	}

	.add-btn:hover {
		color: var(--text-main, #ffffff);
		background: var(--bg-surface-hover, #363636);
	}

	.section-hint {
		display: block;
		font-size: 12px;
		color: var(--text-muted, #808080);
		opacity: 0.7;
	}

	.nav-bottom {
		margin-top: auto;
		padding-top: 12px;
	}
</style>