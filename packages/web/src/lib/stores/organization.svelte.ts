interface Organization {
	id: string
	name: string
	slug: string
}

const STORAGE_KEY = 'saha-orgs'

class OrganizationStore {
	organizations = $state<Organization[]>([])
	activeOrganization = $state<Organization | null>(null)

	constructor() {
		this.loadFromStorage()
	}

	loadFromStorage() {
		if (typeof localStorage === 'undefined') return
		try {
			const stored = localStorage.getItem(STORAGE_KEY)
			if (stored) {
				const data = JSON.parse(stored) as { organizations: Organization[]; activeOrgId: string | null }
				this.organizations = data.organizations ?? []
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
			activeOrgId: this.activeOrganization?.id ?? null
		}
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
	}

	private clearStorage() {
		if (typeof localStorage === 'undefined') return
		localStorage.removeItem(STORAGE_KEY)
	}

	setOrganizations(orgs: Organization[]) {
		this.organizations = orgs
		// Auto-set first org as active if none set
		if (!this.activeOrganization && orgs.length > 0) {
			this.activeOrganization = orgs[0]
		}
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
		this.clearStorage()
	}
}

export const organization = new OrganizationStore()
export type { Organization }