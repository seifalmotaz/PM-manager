import { browser } from '$app/environment'
import { goto } from '$app/navigation'

export interface Organization {
  id: string
  name: string
  slug: string
}

export interface OrgState {
  organizations: Organization[]
  activeOrganization: Organization | null
  isLoaded: boolean
}

const _state = $state<OrgState>({
  organizations: [],
  activeOrganization: null,
  isLoaded: false,
})

export function getOrganization(): OrgState {
  return _state
}

export function setActiveOrganization(org: Organization | null): void {
  _state.activeOrganization = org
  if (org && browser) {
    localStorage.setItem('activeOrgId', org.id)
  } else if (browser) {
    localStorage.removeItem('activeOrgId')
  }
}

export async function fetchOrganizations(): Promise<Organization[]> {
  return _state.organizations
}

export async function loadActiveOrganization(): Promise<void> {
  if (!browser) {
    _state.isLoaded = true
    return
  }

  const storedId = localStorage.getItem('activeOrgId')

  if (storedId && _state.organizations.length > 0) {
    const found = _state.organizations.find(o => o.id === storedId)
    if (found) {
      _state.activeOrganization = found
    } else {
      _state.activeOrganization = _state.organizations[0] ?? null
    }
  } else if (_state.organizations.length > 0) {
    _state.activeOrganization = _state.organizations[0] ?? null
  }

  _state.isLoaded = true
}

export function setOrganizations(orgs: Organization[]): void {
  _state.organizations = orgs
  if (orgs.length > 0 && !_state.activeOrganization) {
    const storedId = browser ? localStorage.getItem('activeOrgId') : null
    const found = storedId ? orgs.find(o => o.id === storedId) : null
    _state.activeOrganization = found ?? orgs[0]
  }
}

export const activeOrganization = {
  get current() { return _state.activeOrganization },
  get all() { return _state.organizations },
  get isLoaded() { return _state.isLoaded },
}

export function navigateToOrg(org: Organization): void {
  setActiveOrganization(org)
  if (browser) {
    goto(`/${org.slug}`)
  }
}