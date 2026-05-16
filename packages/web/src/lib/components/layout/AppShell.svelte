<script lang="ts">
	import type { Snippet } from 'svelte'
	import TopBar from './TopBar.svelte'
	import OrganizationBar from './OrganizationBar.svelte'
	import NavigationSidebar from './NavigationSidebar.svelte'
	import Timer from '$lib/components/time/Timer.svelte'

	let { children }: { children: Snippet } = $props()
</script>

<div class="app-shell">
	<TopBar />
	<div class="app-body">
		<OrganizationBar />
		<NavigationSidebar>
			<svelte:fragment slot="bottom">
				<Timer />
			</svelte:fragment>
		</NavigationSidebar>
		<main class="app-main">
			{@render children()}
		</main>
	</div>
</div>

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
		background: var(--bg-app, #1f1f1f);
	}

	.app-body {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.app-main {
		flex: 1;
		overflow-y: auto;
		background: var(--bg-app, #1f1f1f);
	}
</style>