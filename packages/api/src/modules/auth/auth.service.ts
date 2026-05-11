import { getWorkOS, getWorkOSClientId } from '../../shared/lib/workos'
import { db } from '../../db/connection'
import { users, workspaces, workspaceMembers } from '../../db/schema'
import { eq } from 'drizzle-orm'
import type { AuthUser } from './auth.type'

export const authService = {
  /**
   * Generate the WorkOS OAuth authorization URL
   */
  getAuthorizationUrl(redirectUri: string): string {
    return getWorkOS().userManagement.getAuthorizationUrl({
      provider: 'authkit',
      clientId: getWorkOSClientId(),
      redirectUri,
    })
  },

  /**
   * Exchange an OAuth authorization code for a user.
   * Creates user + personal workspace on first login.
   * Returns existing user on subsequent logins.
   */
  async authenticateWithCode(code: string): Promise<{ user: AuthUser }> {
    const { user: workosUser } = await getWorkOS().userManagement.authenticateWithCode({
      clientId: getWorkOSClientId(),
      code,
    })

    const email = workosUser.email.toLowerCase().trim()
    const name = `${workosUser.firstName ?? ''} ${workosUser.lastName ?? ''}`.trim() || email

    // Check if user already exists
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)

    if (existing.length > 0) {
      return {
        user: {
          id: existing[0].id,
          email: existing[0].email,
          name: existing[0].name || name,
          avatarUrl: existing[0].avatarUrl,
        },
      }
    }

    // First login: create user + personal workspace
    const [newUser] = await db.insert(users).values({
      email,
      name,
    }).returning()

    // Create personal workspace
    const [personalWorkspace] = await db.insert(workspaces).values({
      name: 'Personal',
      slug: `personal-${newUser.id}`,
      type: 'personal',
      createdBy: newUser.id,
    }).returning()

    // Add user as admin member
    await db.insert(workspaceMembers).values({
      workspaceId: personalWorkspace.id,
      userId: newUser.id,
      role: 'admin',
    })

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        avatarUrl: newUser.avatarUrl,
      },
    }
  },

  /**
   * Look up a user by their ID (used by auth guard middleware)
   */
  async getUserById(id: string): Promise<AuthUser | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
    if (!user) return null

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    }
  },
}