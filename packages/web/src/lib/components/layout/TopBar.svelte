<script lang="ts">
	import { ChevronDown, Search, Bell } from 'lucide-svelte'
	import { organization } from '$lib/stores/organization.svelte'
	import { auth } from '$lib/stores/auth.svelte'

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
		let hash = 0
		for (let i = 0; i < auth.user.name.length; i++) {
			hash = auth.user.name.charCodeAt(i) + ((hash << 5) - hash)
		}
		const hue = Math.abs(hash % 360)
		return `hsl(${hue}, 65%, 50%)`
	}
</script>

<header class="topbar">
	<div class="topbar-left">
		<button class="org-switcher">
			<span class="org-switcher-text">
				{organization.activeOrganization?.name ?? 'No organization'}
			</span>
			<ChevronDown size={14} strokeWidth={2} />
		</button>
	</div>

	<div class="topbar-center">
		<div class="search-bar">
			<Search size={14} strokeWidth={2} class="search-icon" />
			<span class="search-placeholder">Search Saha...</span>
			<span class="search-shortcut">
				<kbd>⌘</kbd><kbd>K</kbd>
			</span>
		</div>
	</div>

	<div class="topbar-right">
		<button class="icon-btn notification-btn">
			<Bell size={18} strokeWidth={2} />
			<span class="notification-dot"></span>
		</button>

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
				<span style="font-size: 12px; font-weight: 500;">?</span>
			</span>
		{/if}
	</div>
</header>

<style>
	.topbar {
		height: var(--topbar-height, 48px);
		min-height: var(--topbar-height, 48px);
		background: var(--bg-surface, #282828);
		border-bottom: 1px solid var(--border-main, #333333);
		display: flex;
		align-items: center;
		padding: 0 16px;
		gap: 16px;
	}

	.topbar-left {
		flex: 0 0 auto;
	}

	.org-switcher {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 10px;
		border-radius: var(--radius-md, 5px);
		background: var(--bg-surface-hover, #363636);
		color: var(--text-main, #ffffff);
		font-size: 13px;
		font-weight: 500;
		transition: background-color 0.15s ease;
	}

	.org-switcher:hover {
		background: var(--bg-hover, #404040);
	}

	.org-switcher-text {
		max-width: 150px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.topbar-center {
		flex: 1;
		display: flex;
		justify-content: center;
		max-width: 480px;
		margin: 0 auto;
	}

	.search-bar {
		width: 100%;
		max-width: 400px;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		background: var(--bg-app, #1f1f1f);
		border: 1px solid var(--border-main, #333333);
		border-radius: var(--radius-md, 5px);
		cursor: text;
	}

	.search-bar:hover {
		border-color: var(--border-muted, #444444);
	}

	:global(.search-icon) {
		color: var(--text-muted, #808080);
		flex-shrink: 0;
	}

	.search-placeholder {
		flex: 1;
		font-size: 13px;
		color: var(--text-muted, #808080);
	}

	.search-shortcut {
		display: flex;
		gap: 2px;
		flex-shrink: 0;
	}

	.search-shortcut kbd {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 18px;
		height: 18px;
		padding: 0 4px;
		background: var(--bg-surface-hover, #363636);
		border-radius: 3px;
		font-size: 11px;
		font-weight: 500;
		color: var(--text-muted, #808080);
		font-family: inherit;
	}

	.topbar-right {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.icon-btn {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-md, 5px);
		color: var(--text-main, #ffffff);
		transition: background-color 0.15s ease;
		position: relative;
	}

	.icon-btn:hover {
		background: var(--bg-surface-hover, #363636);
	}

	.notification-btn {
		position: relative;
	}

	.notification-dot {
		position: absolute;
		top: 6px;
		right: 6px;
		width: 6px;
		height: 6px;
		background: var(--brand-primary, #db4c3f);
		border-radius: 50%;
	}

	.user-avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		object-fit: cover;
	}

	.user-initial {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
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