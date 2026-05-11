import { edenTreaty } from '@elysiajs/eden'
import type { App } from 'api'

import { PUBLIC_API_URL } from '$env/static/public'

// In dev, API runs on port 3000
const apiUrl = PUBLIC_API_URL || 'http://localhost:3000'

export const api = edenTreaty<App>(apiUrl, {
  $fetch: {
    credentials: 'include',
  },
})