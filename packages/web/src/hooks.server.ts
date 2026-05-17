import { redirect, type Handle } from '@sveltejs/kit'

export const handle: Handle = async ({ event, resolve }) => {
  const pathname = event.url.pathname

  // Allow public auth routes without any checks
  if (pathname.startsWith('/auth')) {
    return resolve(event)
  }

  // NOTE: Auth is handled client-side via the session cookie (visible via Domain=.saha.localhost).
  // The server hook used to redirect here when the cookie was missing, but that was unreliable
  // because cross-origin cookies weren't visible to the SvelteKit server.
  // Now the client-side auth store (auth.svelte.ts) calls trpc.auth.session.query() on load
  // to verify the session and redirect if needed.

  return resolve(event)
}
