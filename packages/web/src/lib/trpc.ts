import { createTRPCClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from 'api/src/router'

function createClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: 'https://api.saha.localhost/trpc',
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: 'include', // Include cookies in cross-origin requests
          })
        },
      }),
    ],
  })
}

export const trpc = createClient()