import { describe, test, expect } from 'bun:test'
import { authService } from './auth.service'

describe('authService.getAuthorizationUrl', () => {
  test('returns a URL string', () => {
    const url = authService.getAuthorizationUrl()
    expect(typeof url).toBe('string')
  })

  test('URL contains https and workos host', () => {
    const url = authService.getAuthorizationUrl()
    expect(url).toInclude('https://')
    expect(url).toInclude('workos.com')
  })

  test('URL contains redirect_uri parameter', () => {
    const url = authService.getAuthorizationUrl()
    expect(url).toInclude('redirect_uri')
  })
})

describe('authService.exchangeCode', () => {
  test('throws with an invalid code', async () => {
    await expect(
      authService.exchangeCode('invalid_code_12345')
    ).rejects.toThrow()
  })
})
