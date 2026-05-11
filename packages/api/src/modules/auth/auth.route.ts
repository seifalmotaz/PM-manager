import { Elysia, t } from 'elysia'
import { authService } from './auth.service'
import { callbackQuery } from './auth.schema'


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

export const authRoutes = new Elysia({ prefix: '/auth' })
  // Login — redirect to WorkOS OAuth
  .get('/login', ({ redirect }) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5173'
    const url = authService.getAuthorizationUrl(`${baseUrl}/auth/callback`)
    return new Response(null, {
      status: 302,
      headers: { Location: url },
    })
  })

  // Callback — exchange OAuth code, create session
  .get('/callback', async ({ request, set }) => {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')

    if (!code) {
      set.status = 400
      return { error: 'Missing or invalid authorization code' }
    }

    try {
      const { user } = await authService.authenticateWithCode(code)
      
      const response = new Response(JSON.stringify({ user }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })

      response.headers.append('set-cookie', `session=${user.id}; HttpOnly; path=/; sameSite=lax; maxAge=${60 * 60 * 24 * 30}`)

      return response
    } catch (error: any) {
      set.status = 400
      return { error: error.message || 'Authentication failed' }
    }
  })

  // Get current session
  .get('/session', async ({ request, set }) => {
    const cookieHeader = request.headers.get('cookie')
    const cookies = parseCookies(cookieHeader)
    const token = cookies['session']
    
    if (!token) {
      set.status = 401
      return { error: 'No active session' }
    }

    const user = await authService.getUserById(token)
    if (!user) {
      set.status = 401
      return { error: 'Invalid session' }
    }

    return { user }
  })

  // Logout
  .post('/logout', async ({ request, set }) => {
    const response = new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    
    response.headers.append('set-cookie', 'session=; HttpOnly; path=/; sameSite=lax; maxAge=0')
    
    return response
  })
