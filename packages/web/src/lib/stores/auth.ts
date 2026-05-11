import { writable, derived } from 'svelte/store'
import type { AuthUser } from 'shared'

export const currentUser = writable<AuthUser | null>(null)
export const isAuthenticated = derived(currentUser, ($user) => $user !== null)
export const isAuthLoading = writable(true)