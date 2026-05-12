import { redirect, type Handle } from '@sveltejs/kit'

export const handle: Handle = async ({ event, resolve }) => {
  const pathname = event.url.pathname

  // Allow public auth routes
  if (pathname.startsWith('/auth')) {
    return resolve(event)
  }

  // Check for session cookie on protected routes
  const session = event.cookies.get('session')
  if (!session) {
    throw redirect(303, '/auth/login')
  }

  return resolve(event)
}
