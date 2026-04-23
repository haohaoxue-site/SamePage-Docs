import { describe, expect, it, vi } from 'vitest'
import { sha256Hex } from '../../../utils/hash'
import { AuthRegistrationsService } from '../auth-registrations.service'

function createAuthRegistrationsService() {
  const prisma = {
    user: {
      findUnique: vi.fn(),
    },
    authEmailVerificationToken: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  }
  const systemAuthService = {
    assertRegistrationAllowed: vi.fn(async () => {}),
  }
  const authMailerService = {
    sendRegistrationCodeEmail: vi.fn(async () => {}),
  }
  const personalWorkspacesService = {
    provisionPersonalWorkspaceForUser: vi.fn(async () => ({})),
  }
  const authSessionsService = {
    issueAuthSession: vi.fn(async () => ({
      accessToken: 'access-token',
      expiresIn: 3600,
      user: {
        id: 'user_1',
        email: 'new@example.com',
        displayName: 'New User',
        avatarUrl: null,
        userCode: 'SP-NEW123',
        roles: [],
        permissions: [],
        authMethods: ['password'],
        mustChangePassword: false,
        emailVerified: true,
      },
      refreshTokenCookie: 'sp_refresh_token=token',
    })),
  }

  return {
    prisma,
    systemAuthService,
    authMailerService,
    personalWorkspacesService,
    authSessionsService,
    service: new AuthRegistrationsService(
      prisma as never,
      systemAuthService as never,
      authMailerService as never,
      personalWorkspacesService as never,
      authSessionsService as never,
    ),
  }
}

describe('authRegistrationsService', () => {
  it('requestEmailVerification 会作废旧验证码并发送新的注册验证码', async () => {
    const { prisma, systemAuthService, authMailerService, service } = createAuthRegistrationsService()

    prisma.user.findUnique.mockResolvedValue(null)
    prisma.authEmailVerificationToken.findFirst.mockResolvedValue({
      id: 'token_old',
      createdAt: new Date(Date.now() - 61_000),
    })
    prisma.authEmailVerificationToken.updateMany.mockResolvedValue({ count: 1 })
    prisma.authEmailVerificationToken.create.mockResolvedValue(undefined)

    await service.requestEmailVerification(' New@example.com ')

    expect(systemAuthService.assertRegistrationAllowed).toHaveBeenCalledWith('password')
    expect(prisma.authEmailVerificationToken.updateMany).toHaveBeenCalledWith({
      where: {
        email: 'new@example.com',
        purpose: 'REGISTER_VERIFY',
        consumedAt: null,
      },
      data: {
        consumedAt: expect.any(Date),
      },
    })
    expect(prisma.authEmailVerificationToken.create).toHaveBeenCalledWith({
      data: {
        email: 'new@example.com',
        tokenHash: expect.any(String),
        purpose: 'REGISTER_VERIFY',
        expiresAt: expect.any(Date),
      },
    })
    expect(authMailerService.sendRegistrationCodeEmail).toHaveBeenCalledWith({
      email: 'new@example.com',
      code: expect.stringMatching(/^\d{6}$/),
    })
  })

  it('registerWithPassword 会消费验证码、创建用户和本地凭证并签发会话', async () => {
    const {
      prisma,
      systemAuthService,
      personalWorkspacesService,
      authSessionsService,
      service,
    } = createAuthRegistrationsService()
    const request = { headers: {} }
    const tx = {
      authEmailVerificationToken: {
        findFirst: vi.fn(),
        updateMany: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      localCredential: {
        create: vi.fn(),
      },
    }

    tx.authEmailVerificationToken.findFirst.mockResolvedValue({
      id: 'token_1',
      email: 'new@example.com',
      tokenHash: sha256Hex('123456'),
      expiresAt: new Date(Date.now() + 60_000),
    })
    tx.authEmailVerificationToken.updateMany.mockResolvedValue({ count: 1 })
    tx.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
    tx.user.create.mockResolvedValue({
      id: 'user_1',
      email: 'new@example.com',
      displayName: 'New User',
      userCode: 'SP-NEW123',
    })
    tx.localCredential.create.mockResolvedValue(undefined)
    prisma.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => await callback(tx))

    await service.registerWithPassword(
      'new@example.com',
      '123456',
      ' New User ',
      'password123',
      request as never,
    )

    expect(systemAuthService.assertRegistrationAllowed).toHaveBeenCalledWith('password')
    expect(tx.user.create).toHaveBeenCalledWith({
      data: {
        email: 'new@example.com',
        displayName: 'New User',
        userCode: expect.any(String),
      },
    })
    expect(tx.localCredential.create).toHaveBeenCalledWith({
      data: {
        userId: 'user_1',
        passwordHash: expect.any(String),
        emailVerifiedAt: expect.any(Date),
        passwordUpdatedAt: expect.any(Date),
      },
    })
    expect(personalWorkspacesService.provisionPersonalWorkspaceForUser).toHaveBeenCalledWith({
      userId: 'user_1',
      userCode: 'SP-NEW123',
    }, tx)
    expect(authSessionsService.issueAuthSession).toHaveBeenCalledWith('user_1', request)
  })
})
