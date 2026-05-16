import { trpc } from '$lib/trpc'
import { setOrganizations, loadOrganizations } from '$lib/stores/organization.svelte'

const _auth = $state({
  currentUser: null as { id: string; email: string; name: string; avatarUrl: string | null } | null,
  isLoading: true,
})

function getAuth() {
  return _auth
}

function isAuthenticated(): boolean {
  return _auth.currentUser !== null
}

async function fetchSession() {
  try {
    const result = await trpc.auth.session.query()
    _auth.currentUser = result.user
  } catch {
    _auth.currentUser = null
  } finally {
    _auth.isLoading = false
  }
}

async function login() {
  const { url } = await trpc.auth.loginUrl.query()
  window.location.href = url
}

async function logout() {
  await trpc.auth.logout.mutate()
  _auth.currentUser = null
  window.location.href = '/auth/login'
}

async function handleCallback(code: string) {
  const result = await trpc.auth.callback.mutate({ code })
  _auth.currentUser = result.user

  // Set organizations from auth callback (for login flow)
  if (result.organizations) {
    setOrganizations(result.organizations)
  }

  return result
}

// Re-export loadOrganizations for use in layout
export { loadOrganizations }

export { getAuth, isAuthenticated, fetchSession, login, logout, handleCallback }