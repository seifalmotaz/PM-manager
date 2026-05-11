import { Elysia } from 'elysia'
import { authService } from '../../modules/auth/auth.service'
import type { AuthUser } from '../../modules/auth/auth.type'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function parseCookies(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!cookieHeader) return cookies
  
  for (const pair of cookieHeader.split(';')) {
    const [key, ...valueParts] = pair.trim().split('=')
    if (key && valueParts.length > 0) {
      cookies[key] = valueParts.join('=')
    }
  }
  return cookies
}

// authGuard as an Elysia plugin - validates session cookie and attaches user to request
export const authGuard = new Elysia()
  .onBeforeHandle(async ({ request, set }) => {
    const cookieHeader = request.headers.get('cookie')
    const cookies = parseCookies(cookieHeader)
    const sessionToken = cookies['session']

    if (!sessionToken || sessionToken.length === 0 || !UUID_REGEX.test(sessionToken)) {
      set.status = 401
      return { error: 'Unauthorized: No valid session' }
    }

    const user = await authService.getUserById(sessionToken)

    if (!user) {
      set.status = 401
      return { error: 'Unauthorized: User not found' }
    }

    ;(request as any).user = user
  })
