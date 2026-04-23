import { Buffer } from 'node:buffer'
import { describe, expect, it, vi } from 'vitest'
import { UserAvatarsService } from '../user-avatars.service'

function createUserAvatarsService() {
  const prisma = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  }
  const storageService = {
    putObject: vi.fn(),
    getObject: vi.fn(),
    deleteObject: vi.fn(),
  }

  return {
    prisma,
    storageService,
    service: new UserAvatarsService(
      prisma as never,
      storageService as never,
    ),
  }
}

describe('userAvatarsService', () => {
  it('updateCurrentUserAvatar 会上传新头像、更新用户并清理旧对象', async () => {
    const { prisma, storageService, service } = createUserAvatarsService()
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_713_744_000_000)

    prisma.user.findUnique.mockResolvedValue({
      id: 'user_1',
      avatarStorageKey: 'user-avatar/user_1/old.png',
    })
    prisma.user.update.mockResolvedValue(undefined)
    storageService.putObject.mockResolvedValue(undefined)
    storageService.deleteObject.mockResolvedValue(undefined)

    const result = await service.updateCurrentUserAvatar('user_1', {
      fileName: 'avatar.png',
      mimeType: 'image/png',
      buffer: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    })

    expect(storageService.putObject).toHaveBeenCalledWith({
      bucket: 'avatar',
      key: expect.stringMatching(/^user-avatar\/user_1\/1713744000000-.*\.png$/),
      body: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
      contentType: 'image/png',
      contentDisposition: {
        type: 'inline',
        fileName: 'avatar.png',
        fallbackFileName: 'avatar',
      },
      contentLength: 8,
    })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: {
        avatarUrl: expect.stringMatching(/\/users\/avatar\/user_1\?v=1713744000000$/),
        avatarStorageKey: expect.stringMatching(/^user-avatar\/user_1\/1713744000000-.*\.png$/),
      },
    })
    expect(storageService.deleteObject).toHaveBeenCalledWith({
      bucket: 'avatar',
      key: 'user-avatar/user_1/old.png',
    })
    expect(result.avatarUrl).toMatch(/\/users\/avatar\/user_1\?v=1713744000000$/)

    nowSpy.mockRestore()
  })

  it('getUserAvatar 会按用户头像 key 读取对象', async () => {
    const { prisma, storageService, service } = createUserAvatarsService()
    const object = {
      body: Buffer.from('avatar'),
      contentType: 'image/png',
      contentLength: 6,
    }

    prisma.user.findUnique.mockResolvedValue({
      avatarStorageKey: 'user-avatar/user_1/current.png',
    })
    storageService.getObject.mockResolvedValue(object)

    await expect(service.getUserAvatar('user_1')).resolves.toEqual(object)
    expect(storageService.getObject).toHaveBeenCalledWith({
      bucket: 'avatar',
      key: 'user-avatar/user_1/current.png',
    })
  })

  it('removeAvatarObject 会跳过空 key，避免多余删除请求', async () => {
    const { storageService, service } = createUserAvatarsService()

    await service.removeAvatarObject(null)

    expect(storageService.deleteObject).not.toHaveBeenCalled()
  })
})
