import type { FastifyReply, FastifyRequest } from 'fastify'
import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { AuthController } from '../auth.controller'
import { AuthService } from '../auth.service'

describe('authController', () => {
  it('redirects oauth start requests with 302', async () => {
    const authService = {
      buildOAuthAuthorizationUrl: vi.fn(async () => 'https://github.com/login/oauth/authorize?client_id=test'),
    } as unknown as AuthService
    const redirect = vi.fn()
    const response = {
      redirect,
    } as unknown as FastifyReply
    const controller = new AuthController(authService)

    redirect.mockReturnValue(response)

    const result = await controller.startOAuth('github', response)

    expect(authService.buildOAuthAuthorizationUrl).toHaveBeenCalledWith('github')
    expect(redirect).toHaveBeenCalledWith(
      'https://github.com/login/oauth/authorize?client_id=test',
      302,
    )
    expect(result).toBe(response)
  })

  it('redirects oauth callback requests with 302', async () => {
    const authService = {
      handleOAuthCallback: vi.fn(async () => 'http://localhost:5173/auth/callback?code=test'),
    } as unknown as AuthService
    const request = {} as FastifyRequest
    const redirect = vi.fn()
    const response = {
      redirect,
    } as unknown as FastifyReply
    const controller = new AuthController(authService)

    redirect.mockReturnValue(response)

    const result = await controller.callback('github', request, response)

    expect(authService.handleOAuthCallback).toHaveBeenCalledWith('github', request)
    expect(redirect).toHaveBeenCalledWith(
      'http://localhost:5173/auth/callback?code=test',
      302,
    )
    expect(result).toBe(response)
  })

  it('rejects unsupported providers', async () => {
    const controller = new AuthController({} as AuthService)
    const response = {
      redirect: vi.fn(),
    } as unknown as FastifyReply

    await expect(controller.startOAuth('unknown', response)).rejects.toThrow(BadRequestException)
  })
})
