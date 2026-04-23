import { describe, expect, it } from 'vitest'
import { AuthSessionsService } from '../auth-sessions.service'

describe('authSessionsService', () => {
  it('buildLogoutCookieHeader 会返回清除 refresh cookie 的 header', () => {
    const service = Object.create(AuthSessionsService.prototype) as AuthSessionsService

    ;(service as any).isProduction = false
    ;(service as any).jwtConfig = {
      refreshTtlSeconds: 30 * 24 * 60 * 60,
    }

    expect(service.buildLogoutCookieHeader()).toContain('sp_refresh_token=')
    expect(service.buildLogoutCookieHeader()).toContain('Max-Age=0')
    expect(service.buildLogoutCookieHeader()).toContain('Path=/api/auth')
  })
})
