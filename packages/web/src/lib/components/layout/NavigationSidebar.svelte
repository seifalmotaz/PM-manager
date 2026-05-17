<script lang="ts">
	import { Home, BarChart3, LayoutGrid, Plus, ChevronDown, ChevronRight, Folder, Inbox, Users, Clock, Settings, LogOut } from 'lucide-svelte'
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	import { organization } from '$lib/stores/organization.svelte'
	import { workspace } from '$lib/stores/workspace.svelte'
	import { project } from '$lib/stores/project.svelte'
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

	const navItems = [
		{ id: 'home', label: 'Home', icon: Home }
	]

	let activeNav = $derived.by(() => {
		const path = $page.url.pathname
		if (path === '/' || path.startsWith('/home')) return 'home'
		return ''
	})

	function handleNavClick(id: string) {
		if (id === 'home') goto('/')
	}

	let activeOrg = $derived(organization.activeOrganization)
	let isAdmin = $derived(activeOrg ? organization.isOrgAdmin(activeOrg.id) : false)

	// Auto-load workspaces and projects when active org changes
	$effect(() => {
		if (auth.isLoading || !auth.user || !activeOrg) return
		workspace.loadWorkspaces(activeOrg.id)
		project.loadProjects(activeOrg.id)
	})

	// Tree state
	let expandedWorkspaces = $state<Set<string>>(new Set())

	function toggleExpand(wsId: string, e: Event) {
		e.stopPropagation()
		e.preventDefault()
		const next = new Set(expandedWorkspaces)
		if (next.has(wsId)) next.delete(wsId)
		else next.add(wsId)
		expandedWorkspaces = next
	}

	// Active route info for auto-expand
	let activeRouteInfo = $derived.by(() => {
		const path = $page.url.pathname
		const wsMatch = path.match(/^\/workspaces\/([^\/]+)/)
		if (wsMatch) return { type: 'workspace', id: wsMatch[1] }
		const projMatch = path.match(/^\/projects\/([^\/]+)/)
		if (projMatch) {
			const proj = project.projects.find(p => p.id === projMatch[1])
			if (proj) return { type: 'project', workspaceId: proj.workspaceId, projectId: proj.id }
		}
		return null
	})

	// Auto-expand when route changes
	$effect(() => {
		const info = activeRouteInfo
		if (!info) return
		const wsId = info.type === 'workspace' ? info.id : info.workspaceId
		if (wsId && !expandedWorkspaces.has(wsId)) {
			const next = new Set(expandedWorkspaces)
			next.add(wsId)
			expandedWorkspaces = next
		}
	})

	// Active state tracking
	let activeWorkspaceId = $derived.by(() => {
		const path = $page.url.pathname
		const m = path.match(/^\/workspaces\/([^\/]+)/)
		return m?.[1] ?? null
	})

	let activeProjectId = $derived.by(() => {
		const path = $page.url.pathname
		const m = path.match(/^\/projects\/([^\/]+)/)
		return m?.[1] ?? null
	})

	// Projects grouped by workspace
	let projectsByWorkspace = $derived.by(() => {
		const map = new Map<string, typeof project.projects>()
		for (const p of project.projects) {
			if (!map.has(p.workspaceId)) map.set(p.workspaceId, [])
			map.get(p.workspaceId)!.push(p)
		}
		for (const [, list] of map) {
			list.sort((a, b) => a.name.localeCompare(b.name))
		}
		return map
	})

	function truncateText(text: string, maxLength: number): string {
		if (text.length <= maxLength) return text
		return text.slice(0, maxLength - 1) + '…'
	}
</script>

<aside class="nav-sidebar">
	<!-- Organization Dropdown Switcher -->
	<div class="org-switcher">
		<button class="org-switcher-btn">
			<span class="org-switcher-name">{truncateText(activeOrg?.name ?? 'Select an org', 20)}</span>
			<ChevronDown size={14} strokeWidth={2} />
		</button>
	</div>

	<!-- Organization Info Area -->
	<div class="org-info">
		<span class="org-avatar" style:background-color={activeOrg ? getOrgColor(activeOrg.name) : '#808080'}>
			{activeOrg ? getInitials(activeOrg.name) : '?'}
		</span>
		<div class="org-details">
			<span class="org-label">{activeOrg?.name ?? 'No org'}</span>
			<span class="org-type">PERSONAL</span>
		</div>
	</div>

	<div class="nav-separator"></div>

	<!-- Navigation Items -->
	<nav class="nav-list">
		{#each navItems as item (item.id)}
			<button
				class="nav-item"
				class:active={activeNav === item.id}
				onclick={() => handleNavClick(item.id)}
			>
				<item.icon size={18} strokeWidth={2} />
				<span class="nav-label">{item.label}</span>
			</button>
		{/each}
	</nav>

	<div class="nav-separator"></div>

	<!-- Workspaces Section -->
	<div class="nav-section">
		<div class="section-header">
			<span class="section-title">WORKSPACES</span>
			{#if isAdmin}
				<button class="add-btn" onclick={() => workspace.openCreateModal()} title="Create workspace">
					<Plus size={14} strokeWidth={2} />
				</button>
			{/if}
		</div>
		<div class="workspace-tree">
			{#each workspace.workspaces as ws (ws.id)}
				{@const isExpanded = expandedWorkspaces.has(ws.id)}
				{@const isActive = activeWorkspaceId === ws.id}
				{@const projects = projectsByWorkspace.get(ws.id) ?? []}
				<div class="workspace-branch">
					<div
						class="workspace-row"
						class:active={isActive}
						onclick={() => goto(`/workspaces/${ws.id}`)}
					>
						<button
							class="expand-btn"
							onclick={(e) => toggleExpand(ws.id, e)}
						>
							{#if isExpanded}
								<ChevronDown size={14} strokeWidth={2} />
							{:else}
								<ChevronRight size={14} strokeWidth={2} />
							{/if}
						</button>
						<LayoutGrid size={16} strokeWidth={2} />
						<span class="workspace-name">{ws.name}</span>
						<span class="workspace-members">{ws.memberCount}</span>
					</div>
					{#if isExpanded && projects.length > 0}
						<div class="project-list">
							{#each projects as proj (proj.id)}
								{@const isProjActive = activeProjectId === proj.id}
								<button
									class="project-item"
									class:active={isProjActive}
									onclick={() => goto(`/projects/${proj.id}`)}
								>
									{#if proj.isInbox}
										<Inbox size={14} strokeWidth={2} />
									{:else}
										<span
											class="project-dot"
											style:background-color={proj.color ?? 'var(--text-muted)'}
										></span>
									{/if}
									<span class="project-name">{proj.name}</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<div class="nav-separator"></div>

	<!-- Coming Soon Section -->
	<div class="nav-section coming-soon-section">
		<div class="section-header">
			<span class="section-title muted">COMING SOON</span>
		</div>
		<div class="coming-soon-list">
			<button class="coming-soon-item" disabled>
				<BarChart3 size={16} strokeWidth={2} />
				<span class="nav-label">Velocity</span>
				<span class="soon-badge">SOON</span>
			</button>
			<button class="coming-soon-item" disabled>
				<Users size={16} strokeWidth={2} />
				<span class="nav-label">Team</span>
				<span class="soon-badge">SOON</span>
			</button>
			<button class="coming-soon-item" disabled>
				<Clock size={16} strokeWidth={2} />
				<span class="nav-label">Timesheet</span>
				<span class="soon-badge">SOON</span>
			</button>
			<button class="coming-soon-item" disabled>
				<Settings size={16} strokeWidth={2} />
				<span class="nav-label">Settings</span>
				<span class="soon-badge">SOON</span>
			</button>
		</div>
	</div>

	<!-- Bottom User Profile -->
	<div class="nav-bottom">
		<div class="user-profile">
			<span class="user-avatar" style:background-color={auth.user ? getUserColor() : '#808080'}>
				{getUserInitial()}
			</span>
			<span class="user-name">{auth.user?.name ?? 'User'}</span>
			<button class="logout-btn" onclick={() => auth.logout()} title="Logout">
				<LogOut size={16} strokeWidth={2} />
			</button>
		</div>
	</div>
</aside>

<style>
	.nav-sidebar {
		width: var(--sidebar-width, 240px);
		min-width: var(--sidebar-width, 240px);
		height: 100%;
		background: var(--bg-sidebar, #282828);
		border-right: 1px solid var(--border-main, #333333);
		display: flex;
		flex-direction: column;
		padding: 12px 8px;
	}

	/* Organization Dropdown Switcher */
	.org-switcher {
		padding: 0 4px;
		margin-bottom: 8px;
	}

	.org-switcher-btn {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		width: 100%;
		padding: 6px 10px;
		background: var(--bg-surface-hover, #363636);
		border-radius: 6px;
		color: var(--text-main, #ffffff);
		font-size: 13px;
		font-weight: 500;
		transition: background-color 0.15s ease;
	}

	.org-switcher-btn:hover {
		background: var(--bg-surface-hover, #363636);
	}

	.org-switcher-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Organization Info Area */
	.org-info {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 4px 12px 8px;
	}

	.org-avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
		font-weight: 600;
		color: white;
		flex-shrink: 0;
	}

	.org-details {
		display: flex;
		flex-direction: column;
		gap: 2px;
		overflow: hidden;
	}

	.org-label {
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted, #808080);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.org-type {
		font-size: 10px;
		font-weight: 600;
		color: var(--text-muted, #808080);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		opacity: 0.7;
	}

	/* Navigation Items */
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

	/* Separator */
	.nav-separator {
		height: 1px;
		background: var(--border-muted, #2a2a2a);
		margin: 12px 12px;
	}

	/* Section */
	.nav-section {
		padding: 0 4px;
	}

	.coming-soon-section {
		opacity: 0.6;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-right: 2px;
		margin-bottom: 4px;
	}

	.section-title {
		display: block;
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted, #808080);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.section-title.muted {
		opacity: 0.5;
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

	/* Workspace Tree */
	.workspace-tree {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.workspace-branch {
		display: flex;
		flex-direction: column;
	}

	.workspace-row {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px;
		border-radius: 5px;
		color: var(--text-main, #ffffff);
		font-size: 14px;
		transition: background-color 0.15s ease;
		width: 100%;
		text-align: left;
	}

	.workspace-row:hover {
		background: var(--bg-surface-hover, #363636);
	}

	.workspace-row.active {
		background: var(--bg-surface-hover, #363636);
		position: relative;
	}

	.workspace-row.active::before {
		content: '';
		position: absolute;
		left: 0;
		top: 6px;
		bottom: 6px;
		width: 3px;
		background: var(--brand-primary, #db4c3f);
		border-radius: 0 2px 2px 0;
	}

	.expand-btn {
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		color: var(--text-muted, #808080);
		flex-shrink: 0;
		transition: background-color 0.15s ease, color 0.15s ease;
	}

	.expand-btn:hover {
		background: var(--bg-surface-hover, #363636);
		color: var(--text-main, #ffffff);
	}

	.workspace-name {
		flex: 1;
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.workspace-members {
		font-size: 12px;
		color: var(--text-muted, #808080);
		font-weight: 500;
	}

	/* Project List */
	.project-list {
		display: flex;
		flex-direction: column;
	}

	.project-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px 6px 36px;
		border-radius: 5px;
		color: var(--text-muted, #808080);
		font-size: 13px;
		width: 100%;
		text-align: left;
		transition: background-color 0.15s ease, color 0.15s ease;
	}

	.project-item:hover {
		background: var(--bg-surface-hover, #363636);
		color: var(--text-main, #ffffff);
	}

	.project-item.active {
		background: var(--bg-surface-hover, #363636);
		color: var(--text-main, #ffffff);
		position: relative;
	}

	.project-item.active::before {
		content: '';
		position: absolute;
		left: 0;
		top: 4px;
		bottom: 4px;
		width: 3px;
		background: var(--brand-primary, #db4c3f);
		border-radius: 0 2px 2px 0;
	}

	.project-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.project-name {
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Coming Soon List */
	.coming-soon-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.coming-soon-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 12px;
		border-radius: 5px;
		color: var(--text-muted, #808080);
		font-size: 14px;
		width: 100%;
		text-align: left;
		cursor: default;
	}

	.coming-soon-item:disabled {
		opacity: 0.5;
	}

	.soon-badge {
		margin-left: auto;
		background: #3a3a3a;
		color: var(--text-muted, #808080);
		font-size: 10px;
		font-weight: 600;
		padding: 2px 6px;
		border-radius: 3px;
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}

	/* Bottom User Profile */
	.nav-bottom {
		margin-top: auto;
		padding-top: 12px;
	}

	.user-profile {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 12px;
		border-radius: var(--radius-md, 5px);
		transition: background-color 0.15s ease;
	}

	.user-profile:hover {
		background: var(--bg-surface-hover, #363636);
	}

	.user-avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		font-weight: 600;
		color: white;
		flex-shrink: 0;
	}

	.user-name {
		flex: 1;
		font-size: 13px;
		font-weight: 500;
		color: var(--text-main, #ffffff);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.logout-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-sm, 4px);
		color: var(--text-muted, #808080);
		transition: color 0.15s ease, background-color 0.15s ease;
	}

	.logout-btn:hover {
		color: var(--text-main, #ffffff);
		background: var(--bg-surface-hover, #363636);
	}
</style>