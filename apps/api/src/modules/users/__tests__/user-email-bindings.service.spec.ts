import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { sha256Hex } from '../../../utils/hash'
import { UserEmailBindingsService } from '../user-email-bindings.service'

function createUserEmailBindingsService() {
  const prisma = {
    user: {
      findUnique: vi.fn(),
    },
    userEmailVerificationCode: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  }
  const authMailerService = {
    sendBindEmailCodeEmail: vi.fn(),
  }
  const systemEmailService = {
    isEnabled: vi.fn(),
  }

  return {
    prisma,
    authMailerService,
    systemEmailService,
    service: new UserEmailBindingsService(
      prisma as never,
      authMailerService as never,
      systemEmailService as never,
    ),
  }
}

describe('userEmailBindingsService', () => {
  it('requestBindEmailCode 会作废旧验证码并发送新的绑定验证码', async () => {
    const { prisma, authMailerService, systemEmailService, service } = createUserEmailBindingsService()

    systemEmailService.isEnabled.mockResolvedValue(true)
    prisma.user.findUnique
      .mockResolvedValueOnce({ email: 'current@example.com' })
      .mockResolvedValueOnce(null)
    prisma.userEmailVerificationCode.findFirst.mockResolvedValue({
      id: 'code_old',
      lastSentAt: new Date(Date.now() - 61_000),
    })
    prisma.userEmailVerificationCode.updateMany.mockResolvedValue({ count: 1 })
    prisma.userEmailVerificationCode.create.mockResolvedValue(undefined)
    authMailerService.sendBindEmailCodeEmail.mockResolvedValue(undefined)

    await expect(service.requestBindEmailCode('user_1', ' Next@example.com ')).resolves.toEqual({
      requested: true,
    })

    expect(prisma.userEmailVerificationCode.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user_1',
        purpose: 'BIND_EMAIL',
        consumedAt: null,
      },
      data: {
        consumedAt: expect.any(Date),
      },
    })
    expect(prisma.userEmailVerificationCode.create).toHaveBeenCalledWith({
      data: {
        userId: 'user_1',
        email: 'next@example.com',
        purpose: 'BIND_EMAIL',
        codeHash: expect.any(String),
        expiresAt: expect.any(Date),
      },
    })
    expect(authMailerService.sendBindEmailCodeEmail).toHaveBeenCalledWith({
      email: 'next@example.com',
      code: expect.stringMatching(/^\d{6}$/),
    })
  })

  it('confirmBindEmail 首次绑定邮箱时会创建本地密码登录凭证', async () => {
    const { prisma, service } = createUserEmailBindingsService()
    const transaction = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      userEmailVerificationCode: {
        updateMany: vi.fn(),
      },
      localCredential: {
        create: vi.fn(),
        update: vi.fn(),
      },
    }

    prisma.userEmailVerificationCode.findFirst.mockResolvedValue({
      id: 'code_1',
      email: 'next@example.com',
      codeHash: sha256Hex('123456'),
      expiresAt: new Date(Date.now() + 60_000),
      attemptCount: 0,
    })
    prisma.user.findUnique.mockResolvedValue(null)
    transaction.user.findUnique.mockResolvedValue({
      id: 'user_1',
      localCredential: null,
    })
    transaction.userEmailVerificationCode.updateMany.mockResolvedValue({ count: 1 })
    transaction.user.update.mockResolvedValue(undefined)
    transaction.localCredential.create.mockResolvedValue(undefined)
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof transaction) => Promise<void>) => await callback(transaction))

    await expect(service.confirmBindEmail('user_1', {
      email: 'next@example.com',
      code: '123456',
      newPassword: 'password123',
    })).resolves.toBeUndefined()

    expect(transaction.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: {
        email: 'next@example.com',
      },
    })
    expect(transaction.localCredential.create).toHaveBeenCalledWith({
      data: {
        userId: 'user_1',
        passwordHash: expect.any(String),
        emailVerifiedAt: expect.any(Date),
        passwordUpdatedAt: expect.any(Date),
      },
    })
  })

  it('confirmBindEmail 验证码错误时会累计尝试次数', async () => {
    const { prisma, service } = createUserEmailBindingsService()

    prisma.userEmailVerificationCode.findFirst.mockResolvedValue({
      id: 'code_1',
      email: 'next@example.com',
      codeHash: sha256Hex('654321'),
      expiresAt: new Date(Date.now() + 60_000),
      attemptCount: 0,
    })
    prisma.userEmailVerificationCode.update.mockResolvedValue(undefined)

    await expect(service.confirmBindEmail('user_1', {
      email: 'next@example.com',
      code: '123456',
      newPassword: 'password123',
    })).rejects.toThrow(BadRequestException)

    expect(prisma.userEmailVerificationCode.update).toHaveBeenCalledWith({
      where: { id: 'code_1' },
      data: {
        attemptCount: {
          increment: 1,
        },
      },
    })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})
