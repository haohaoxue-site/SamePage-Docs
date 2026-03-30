import type { ExecutionContext } from '@nestjs/common'
import { ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { describe, expect, it } from 'vitest'
import { PermissionsGuard } from '../permissions.guard'

function createContext(permissions: string[]): ExecutionContext {
  return {
    getClass: () => ({}),
    getHandler: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        authUser: {
          permissions,
        },
      }),
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext
}

describe('permissionsGuard', () => {
  it('passes when all required permissions are present', () => {
    const reflector = {
      getAllAndOverride: () => ['user:read_self'],
    } as unknown as Reflector
    const guard = new PermissionsGuard(reflector)

    const result = guard.canActivate(createContext(['user:read_self']))

    expect(result).toBe(true)
  })

  it('throws forbidden when required permissions are missing', () => {
    const reflector = {
      getAllAndOverride: () => ['system_admin:user:update_role'],
    } as unknown as Reflector
    const guard = new PermissionsGuard(reflector)

    expect(() => guard.canActivate(createContext(['user:read_self']))).toThrow(
      ForbiddenException,
    )
  })
})
