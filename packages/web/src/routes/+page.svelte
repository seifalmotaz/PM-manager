<script lang="ts">
	import { goto } from '$app/navigation'
	import { auth } from '$lib/stores/auth.svelte'
	import { trpc } from '$lib/trpc'
	import { toast } from '$lib/stores/toast.svelte'
	import KanbanBoard from '$lib/components/board/KanbanBoard.svelte'

	let isCheckingOrg = $state(true)
	let initialized = $state(false)

	$effect(() => {
		if (initialized) return
		initialized = true

		// If no user, redirect to login
		if (!auth.user) {
			goto('/auth/login')
			return
		}

		// Check if user has organization
		const storedWorkosUserId = sessionStorage.getItem('workosUserId')
		if (!storedWorkosUserId) {
			goto('/auth/login')
			return
		}

		trpc.auth.hasOrganization.query({ workosUserId: storedWorkosUserId })
			.then((result) => {
				if (!result.hasOrg) {
					goto('/auth/onboarding')
				}
			})
			.catch((error) => {
				console.error('Failed to check organization:', error)
				// On error, stay on page and let user proceed
			})
			.finally(() => {
				isCheckingOrg = false
			})
	})
</script>

{#if isCheckingOrg || auth.isLoading}
	<div class="loading-page">
		<p>Loading...</p>
	</div>
{:else if auth.user}
	<KanbanBoard />
{/if}

<style>
	.loading-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		background: var(--bg-app);
		color: var(--text-muted);
	}
</style>