import { redirect, type Handle } from '@sveltejs/kit'

// Routes that require authentication
const protectedPaths = ['/home', '/velocity', '/projects']

// Auth pages (redirect to /home if already logged in)
const authPages = ['/auth/login', '/auth/callback']

export const handle: Handle = async ({ event, resolve }) => {
  const path = event.url.pathname

  // Check for session cookie (set by API on login)
  const hasSession = !!event.cookies.get('session')

  // Protected routes: redirect to login if no session
  const isProtected = protectedPaths.some(p => path.startsWith(p))
  if (isProtected && !hasSession) {
    throw redirect(302, '/auth/login')
  }

  // Auth pages: redirect to /home if already logged in
  const isAuthPage = authPages.some(p => path.startsWith(p))
  if (isAuthPage && hasSession && path !== '/auth/logout') {
    throw redirect(302, '/home')
  }

  return resolve(event)
}