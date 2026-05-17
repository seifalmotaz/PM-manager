import { goto } from '$app/navigation'
import { trpc } from '$lib/trpc'
import { organization } from './organization.svelte'
import type { User } from 'shared'

const WORKOS_USER_ID_KEY = 'saha-workos-user-id'

class AuthStore {
	user = $state<User | null>(null)
	isLoading = $state(true)
	workosUserId = $state<string | null>(null)

	constructor() {
		// Restore session on store initialization
		this.restoreSession()
	}

	async restoreSession() {
		this.isLoading = true
		try {
			const response = await trpc.auth.session.query()
			this.user = response.user
			// Restore workosUserId from localStorage (persisted during callback)
			if (typeof localStorage !== 'undefined') {
				const storedWorkosUserId = localStorage.getItem(WORKOS_USER_ID_KEY)
				if (storedWorkosUserId) {
					this.workosUserId = storedWorkosUserId
					// Also mirror to sessionStorage for legacy code that checks it
					sessionStorage.setItem('workosUserId', storedWorkosUserId)
				}
			}
		} catch {
			this.user = null
			this.workosUserId = null
		} finally {
			this.isLoading = false
		}
	}

	async login() {
		const result = await trpc.auth.loginUrl.query()
		window.location.href = result.url
	}

	async handleCallback(code: string) {
		const response = await trpc.auth.callback.mutate({ code })
		this.user = response.user
		this.workosUserId = response.workosUserId
		organization.setOrganizations(response.organizations, response.orgRoles ?? {})
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
		return this.restoreSession()
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
