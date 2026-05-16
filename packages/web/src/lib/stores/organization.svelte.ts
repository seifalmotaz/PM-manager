interface Organization {
	id: string
	name: string
	slug: string
}

class OrganizationStore {
	organizations = $state<Organization[]>([])
	activeOrganization = $state<Organization | null>(null)

	setOrganizations(orgs: Organization[]) {
		this.organizations = orgs
		// Auto-set first org as active if none set
		if (!this.activeOrganization && orgs.length > 0) {
			this.activeOrganization = orgs[0]
		}
	}

	getOrganization() {
		return { activeOrganization: this.activeOrganization }
	}

	setActiveOrganization(org: Organization | null) {
		this.activeOrganization = org
	}

	clearOrganizations() {
		this.organizations = []
		this.activeOrganization = null
	}
}

export const organization = new OrganizationStore()
export type { Organization }