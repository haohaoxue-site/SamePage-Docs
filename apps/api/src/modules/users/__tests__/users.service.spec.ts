import type { CurrentUserDto } from '@haohaoxue/samepage-domain'
import type { PrismaService } from '../../../database/prisma.service'
import type { AuthMailerService } from '../../auth/auth-mailer.service'
import type { AuthService } from '../../auth/auth.service'
import type { RbacService } from '../../rbac/rbac.service'
import type { StorageService } from '../../storage/storage.service'
import type { SystemEmailService } from '../../system-email/system-email.service'
import { ACCOUNT_DELETION_CONFIRMATION_PHRASE, ROLES } from '@haohaoxue/samepage-contracts'
import { AuthProvider, UserStatus } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import { UsersService } from '../users.service'

function createUsersService(
  prisma: PrismaService,
  overrides: {
    storageService?: StorageService
  } = {},
) {
  return new UsersService(
    prisma,
    {} as RbacService,
    {} as AuthService,
    {} as AuthMailerService,
    overrides.storageService ?? ({
      removeAvatar: vi.fn(async () => undefined),
    } as unknown as StorageService),
    {} as SystemEmailService,
  )
}

describe('usersService', () => {
  it('filters soft-deleted oauth accounts when loading user settings', async () => {
    const findUnique = vi.fn(async () => ({
      email: 'alice@example.com',
      displayName: 'Alice',
      avatarUrl: null,
      localCredential: {
        userId: 'user-1',
        emailVerifiedAt: new Date('2026-04-12T00:00:00.000Z'),
      },
      preference: null,
      oauthAccounts: [
        {
          provider: AuthProvider.GITHUB,
          providerUsername: 'alice',
        },
      ],
    }))
    const prisma = {
      user: {
        findUnique,
      },
    } as unknown as PrismaService
    const service = createUsersService(prisma)

    await service.getCurrentUserSettings('user-1')

    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-1' },
      select: expect.objectContaining({
        oauthAccounts: expect.objectContaining({
          where: {
            deletedAt: null,
          },
        }),
      }),
    }))
  })

  it('filters soft-deleted oauth accounts before disconnecting provider binding', async () => {
    const findUnique = vi.fn(async () => ({
      localCredential: {
        userId: 'user-1',
      },
      oauthAccounts: [
        {
          id: 'oauth-1',
          provider: AuthProvider.GITHUB,
        },
      ],
    }))
    const deleteAccount = vi.fn(async () => undefined)
    const getCurrentUser = vi.fn(async (): Promise<CurrentUserDto> => ({
      id: 'user-1',
      email: 'alice@example.com',
      displayName: 'Alice',
      avatarUrl: null,
      status: UserStatus.ACTIVE,
      roles: [],
      permissions: [],
      authMethods: ['github'],
      mustChangePassword: false,
      emailVerified: true,
    }))
    const prisma = {
      user: {
        findUnique,
      },
      oauthAccount: {
        delete: deleteAccount,
      },
    } as unknown as PrismaService
    const service = createUsersService(prisma)
    vi.spyOn(service, 'getCurrentUser').mockImplementation(getCurrentUser)

    await service.disconnectOauthBinding('user-1', 'github')

    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-1' },
      select: expect.objectContaining({
        oauthAccounts: expect.objectContaining({
          where: {
            deletedAt: null,
          },
        }),
      }),
    }))
    expect(deleteAccount).toHaveBeenCalledWith({
      where: { id: 'oauth-1' },
    })
  })

  it('hard deletes the current user and clears pending oauth states', async () => {
    const findUnique = vi.fn(async () => ({
      id: 'user-1',
      email: 'alice@example.com',
      displayName: 'Alice',
      avatarStorageKey: 'avatar-key',
    }))
    const deleteMany = vi.fn(async () => ({ count: 1 }))
    const deleteUser = vi.fn(async () => undefined)
    const transaction = vi.fn(async callback => callback({
      authOauthState: {
        deleteMany,
      },
      user: {
        delete: deleteUser,
      },
    }))
    const removeAvatar = vi.fn(async () => undefined)
    const prisma = {
      $bypass: {
        user: {
          findUnique,
        },
        $transaction: transaction,
      },
    } as unknown as PrismaService
    const service = createUsersService(prisma, {
      storageService: ({
        removeAvatar,
      } as unknown as StorageService),
    })

    await service.deleteCurrentUser({
      id: 'user-1',
      roles: [ROLES.USER],
      permissions: [],
    }, {
      accountConfirmation: ' Alice@Example.com ',
      confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
    })

    expect(transaction).toHaveBeenCalledTimes(1)
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        initiatorUserId: 'user-1',
      },
    })
    expect(deleteUser).toHaveBeenCalledWith({
      where: {
        id: 'user-1',
      },
    })
    expect(removeAvatar).toHaveBeenCalledWith('avatar-key')
  })

  it('uses display name as the confirmation target when email is missing', async () => {
    const deleteUser = vi.fn(async () => undefined)
    const prisma = {
      $bypass: {
        user: {
          findUnique: vi.fn(async () => ({
            id: 'user-1',
            email: null,
            displayName: 'Alice',
            avatarStorageKey: null,
          })),
        },
        $transaction: vi.fn(async callback => callback({
          authOauthState: {
            deleteMany: vi.fn(async () => ({ count: 0 })),
          },
          user: {
            delete: deleteUser,
          },
        })),
      },
    } as unknown as PrismaService
    const service = createUsersService(prisma)

    await service.deleteCurrentUser({
      id: 'user-1',
      roles: [ROLES.USER],
      permissions: [],
    }, {
      accountConfirmation: ' Alice ',
      confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
    })

    expect(deleteUser).toHaveBeenCalledTimes(1)
  })

  it('rejects self deletion for system administrators', async () => {
    const service = createUsersService({} as PrismaService)

    await expect(service.deleteCurrentUser({
      id: 'user-1',
      roles: [ROLES.SYSTEM_ADMIN],
      permissions: [],
    }, {
      accountConfirmation: 'alice@example.com',
      confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
    })).rejects.toThrow('系统管理员账号不支持在这里删除')
  })

  it('rejects display name updates for system administrators', async () => {
    const update = vi.fn(async () => undefined)
    const prisma = {
      user: {
        update,
      },
    } as unknown as PrismaService
    const service = createUsersService(prisma)

    await expect(service.updateCurrentUserProfile({
      id: 'user-1',
      roles: [ROLES.SYSTEM_ADMIN],
      permissions: [],
    }, 'New Name')).rejects.toThrow('系统管理员账号不支持修改显示名称')

    expect(update).not.toHaveBeenCalled()
  })
})
