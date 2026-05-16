<script lang="ts">
	import { Home, Plus, User } from 'lucide-svelte'
	import { organization } from '$lib/stores/organization.svelte'
	import { auth } from '$lib/stores/auth.svelte'

	function getInitials(name: string): string {
		const words = name.trim().split(/\s+/)
		if (words.length === 1) {
			return words[0].charAt(0).toUpperCase()
		}
		return words.slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('')
	}

	function getOrgColor(name: string): string {
		let hash = 0
		for (let i = 0; i < name.length; i++) {
			hash = name.charCodeAt(i) + ((hash << 5) - hash)
		}
		const hue = Math.abs(hash % 360)
		return `hsl(${hue}, 65%, 50%)`
	}

	function handleOrgClick(org: { id: string; name: string; slug: string }) {
		organization.setActiveOrganization(org)
	}

	function getUserInitial(): string {
		if (!auth.user?.name) return ''
		const words = auth.user.name.trim().split(/\s+/)
		if (words.length === 1) {
			return words[0].charAt(0).toUpperCase()
		}
		return words[0].charAt(0).toUpperCase()
	}

	function getUserColor(): string {
		if (!auth.user?.name) return 'hsl(0, 0%, 50%)'
		return getOrgColor(auth.user.name)
	}
</script>

<aside class="org-bar">
	<div class="org-bar-top">
		<button class="home-btn" title="Saha Home">
			<div class="home-icon">
				<Home size={20} strokeWidth={2} />
			</div>
		</button>
	</div>

	<div class="org-list">
		{#each organization.organizations as org (org.id)}
			{@const isActive = organization.activeOrganization?.id === org.id}
			<button
				class="org-item"
				class:active={isActive}
				title={org.name}
				onclick={() => handleOrgClick(org)}
			>
				<span class="org-avatar" style:background-color={getOrgColor(org.name)}>
					{getInitials(org.name)}
				</span>
			</button>
		{/each}

		<button class="org-item add-org" title="Add Organization">
			<span class="org-avatar add-icon">
				<Plus size={16} strokeWidth={2.5} />
			</span>
		</button>
	</div>

	<div class="org-bar-bottom">
		{#if auth.user}
			{#if auth.user.avatarUrl}
				<img class="user-avatar" src={auth.user.avatarUrl} alt={auth.user.name ?? 'User'} />
			{:else}
				<span class="user-avatar user-initial" style:background-color={getUserColor()}>
					{getUserInitial()}
				</span>
			{/if}
		{:else}
			<span class="user-avatar user-icon">
				<User size={18} strokeWidth={2} />
			</span>
		{/if}
	</div>
</aside>

<style>
	.org-bar {
		width: var(--sidebar-collapsed-width, 68px);
		min-width: var(--sidebar-collapsed-width, 68px);
		height: 100%;
		background: var(--bg-sidebar, #282828);
		border-right: 1px solid var(--border-main, #333333);
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 8px 0;
	}

	.org-bar-top {
		width: 100%;
		display: flex;
		justify-content: center;
		padding: 4px 0;
		margin-bottom: 8px;
	}

	.home-btn {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-md, 5px);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background-color 0.15s ease;
	}

	.home-btn:hover {
		background: var(--bg-surface-hover, #363636);
	}

	.home-icon {
		width: 28px;
		height: 28px;
		background: var(--brand-primary, #db4c3f);
		border-radius: var(--radius-sm, 3px);
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
	}

	.org-list {
		flex: 1;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 4px 0;
	}

	.org-item {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-md, 5px);
		transition: background-color 0.15s ease;
		position: relative;
	}

	.org-item:hover {
		background: var(--bg-surface-hover, #363636);
	}

	.org-item.active {
		background: var(--bg-surface-hover, #363636);
	}

	.org-item.active::before {
		content: '';
		position: absolute;
		left: 0;
		top: 8px;
		bottom: 8px;
		width: 3px;
		background: white;
		border-radius: 0 2px 2px 0;
	}

	.org-avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
		font-weight: 600;
		color: white;
		text-transform: uppercase;
		user-select: none;
	}

	.add-icon {
		background: transparent;
		border: 2px dashed var(--text-muted, #808080);
		color: var(--text-muted, #808080);
	}

	.org-item:hover .add-icon {
		border-color: var(--text-main, #ffffff);
		color: var(--text-main, #ffffff);
	}

	.org-bar-bottom {
		width: 100%;
		display: flex;
		justify-content: center;
		padding: 8px 0 4px;
		margin-top: auto;
	}

	.user-avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		object-fit: cover;
	}

	.user-initial {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		font-weight: 600;
		color: white;
	}

	.user-icon {
		background: var(--bg-surface-hover, #363636);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted, #808080);
	}
</style>