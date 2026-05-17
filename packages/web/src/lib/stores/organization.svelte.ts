interface Organization {
	id: string
	name: string
	slug: string
}

const STORAGE_KEY = 'saha-orgs'

class OrganizationStore {
	organizations = $state<Organization[]>([])
	activeOrganization = $state<Organization | null>(null)
	orgRoles = $state<Record<string, string>>({})

	constructor() {
		this.loadFromStorage()
	}

	loadFromStorage() {
		if (typeof localStorage === 'undefined') return
		try {
			const stored = localStorage.getItem(STORAGE_KEY)
			if (stored) {
				const data = JSON.parse(stored) as { organizations: Organization[]; activeOrgId: string | null; orgRoles: Record<string, string> }
				this.organizations = data.organizations ?? []
				this.orgRoles = data.orgRoles ?? {}
				if (data.activeOrgId) {
					this.activeOrganization = this.organizations.find((org) => org.id === data.activeOrgId) ?? null
				}
			}
		} catch {
			// Invalid stored data, ignore
		}
	}

	private saveToStorage() {
		if (typeof localStorage === 'undefined') return
		const data = {
			organizations: this.organizations,
			activeOrgId: this.activeOrganization?.id ?? null,
			orgRoles: this.orgRoles
		}
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
	}

	private clearStorage() {
		if (typeof localStorage === 'undefined') return
		localStorage.removeItem(STORAGE_KEY)
	}

	setOrganizations(orgs: Organization[], roles?: Record<string, string>) {
		this.organizations = orgs
		if (roles) {
			this.orgRoles = roles
		}
		// Auto-set first org as active if none set
		if (!this.activeOrganization && orgs.length > 0) {
			this.activeOrganization = orgs[0]
		}
		this.saveToStorage()
	}

	isOrgAdmin(orgId: string): boolean {
		const role = this.orgRoles[orgId]
		return role === 'admin' || role === 'owner'
	}

	addOrganization(org: Organization, role: string) {
		this.organizations = [...this.organizations, org]
		this.orgRoles[org.id] = role
		this.setActiveOrganization(org)
		this.saveToStorage()
	}

	getOrganization() {
		return { activeOrganization: this.activeOrganization }
	}

	setActiveOrganization(org: Organization | null) {
		this.activeOrganization = org
		this.saveToStorage()
	}

	clearOrganizations() {
		this.organizations = []
		this.activeOrganization = null
		this.orgRoles = {}
		this.clearStorage()
	}
}

export const organization = new OrganizationStore()
export type { Organization }