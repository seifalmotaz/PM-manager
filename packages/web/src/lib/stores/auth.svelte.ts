import { goto } from '$app/navigation'
import { trpc } from '$lib/trpc'
import { organization } from './organization.svelte'
import type { User } from 'shared'

const WORKOS_USER_ID_KEY = 'saha-workos-user-id'

class AuthStore {
	user = $state<User | null>(null)
	isLoading = $state(true)
	workosUserId = $state<string | null>(null)

	async login() {
		const result = await trpc.auth.loginUrl.query()
		window.location.href = result.url
	}

	async handleCallback(code: string) {
		const response = await trpc.auth.callback.mutate({ code })
		this.user = response.user
		this.workosUserId = response.workosUserId
		organization.setOrganizations(response.organizations)
		sessionStorage.setItem('workosUserId', response.workosUserId)
		localStorage.setItem(WORKOS_USER_ID_KEY, response.workosUserId)
		this.isLoading = false
		return {
			isNew: response.isNew,
			workosUserId: response.workosUserId,
			organizations: response.organizations
		}
	}

	async checkSession() {
		try {
			const response = await trpc.auth.session.query()
			this.user = response.user
		} catch {
			this.user = null
		} finally {
			this.isLoading = false
		}
		return this.user
	}

	async logout() {
		await trpc.auth.logout.mutate()
		this.user = null
		this.workosUserId = null
		sessionStorage.removeItem('workosUserId')
		localStorage.removeItem('saha-orgs')
		localStorage.removeItem(WORKOS_USER_ID_KEY)
		goto('/auth/login')
	}
}

export const auth = new AuthStore()