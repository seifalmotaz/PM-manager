import { WorkOS } from '@workos-inc/node'

let _workos: WorkOS | null = null

export function getWorkOS(): WorkOS {
  if (!_workos) {
    const apiKey = process.env.WORKOS_API_KEY
    const clientId = process.env.WORKOS_CLIENT_ID

    if (!apiKey || !clientId) {
      throw new Error('WORKOS_API_KEY and WORKOS_CLIENT_ID must be set in environment')
    }

    _workos = new WorkOS(apiKey)
  }
  return _workos
}

export function getWorkOSClientId(): string {
  const clientId = process.env.WORKOS_CLIENT_ID
  if (!clientId) {
    throw new Error('WORKOS_CLIENT_ID must be set in environment')
  }
  return clientId
}