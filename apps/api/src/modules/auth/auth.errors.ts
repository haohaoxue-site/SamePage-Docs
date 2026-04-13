import { AUTH_ERROR_CODE } from '@haohaoxue/samepage-contracts'
import { UnauthorizedException } from '@nestjs/common'

type AuthErrorCode = (typeof AUTH_ERROR_CODE)[keyof typeof AUTH_ERROR_CODE]

export function authUnauthorized(code: AuthErrorCode, message: string) {
  return new UnauthorizedException({
    code,
    message,
  })
}
