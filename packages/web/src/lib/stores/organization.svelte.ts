interface Organization {
  id: string      // WorkOS org ID
  name: string
  slug: string
}

interface OrgState {
  activeOrganization: Organization | null
  isLoading: boolean
}

const _state = $state<OrgState>({
  activeOrganization: null,
  isLoading: true,
})

export function getOrganization(): OrgState {
  return _state
}

export function setActiveOrganization(org: Organization | null): void {
  _state.activeOrganization = org
  if (org) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeOrgId', org.id)
    }
  } else {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('activeOrgId')
    }
  }
}

export async function loadActiveOrganization(): Promise<void> {
  if (typeof window === 'undefined') {
    _state.isLoading = false
    return
  }
  
  const storedId = localStorage.getItem('activeOrgId')
  if (storedId) {
    // L1 will fetch org from backend/WorkOS
    // For now, placeholder
    _state.isLoading = false
  } else {
    _state.isLoading = false
  }
}

// Convenience getter
export const activeOrganization = {
  get current() { return _state.activeOrganization },
  get isLoading() { return _state.isLoading },
}