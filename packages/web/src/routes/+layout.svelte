<script lang="ts">
	import '../app.css'
	import Toast from '$lib/components/Toast.svelte'
	import AppShell from '$lib/components/layout/AppShell.svelte'
	import { page } from '$app/stores'

	let { children } = $props()

	let isAuthRoute = $derived($page.url.pathname.startsWith('/auth'))
</script>

<Toast />
{#if isAuthRoute}
	{@render children()}
{:else}
	<AppShell>
		{@render children()}
	</AppShell>
{/if}