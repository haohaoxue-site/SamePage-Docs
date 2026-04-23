import { NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { ChatSessionsService } from '../chat-sessions.service'

function createChatSessionsService() {
  const prisma = {
    chatSession: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
    chatSessionMessage: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  }

  return {
    prisma,
    service: new ChatSessionsService(prisma as never),
  }
}

describe('chatSessionsService', () => {
  it('deleteSession 在会话不属于当前用户时抛出未找到', async () => {
    const { prisma, service } = createChatSessionsService()
    prisma.chatSession.deleteMany.mockResolvedValue({ count: 0 })

    await expect(service.deleteSession('user_1', 'session_1')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('prepareCompletionSession 会在首条消息时更新标题并写入用户消息', async () => {
    const { prisma, service } = createChatSessionsService()
    const session = {
      id: 'session_1',
      title: '新对话',
      createdAt: new Date('2026-04-21T00:00:00.000Z'),
      updatedAt: new Date('2026-04-22T00:00:00.000Z'),
      messages: [],
    }

    prisma.chatSession.findFirst.mockResolvedValue(session)
    prisma.chatSession.update.mockReturnValue({ kind: 'update-session' })
    prisma.chatSessionMessage.create.mockReturnValue({ kind: 'create-user-message' })
    prisma.$transaction.mockResolvedValue([])

    const result = await service.prepareCompletionSession({
      userId: 'user_1',
      sessionId: 'session_1',
      content: '  请帮我总结这段需求并给出拆分建议  ',
    })

    expect(prisma.chatSession.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'session_1',
        userId: 'user_1',
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          select: {
            role: true,
            content: true,
            order: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    })
    expect(prisma.$transaction).toHaveBeenCalledWith([
      { kind: 'update-session' },
      { kind: 'create-user-message' },
    ])
    expect(prisma.chatSession.update).toHaveBeenCalledWith({
      where: { id: 'session_1' },
      data: {
        title: '请帮我总结这段需求并给出拆分建议',
        updatedAt: expect.any(Date),
      },
    })
    expect(prisma.chatSessionMessage.create).toHaveBeenCalledWith({
      data: {
        sessionId: 'session_1',
        role: 'USER',
        content: '请帮我总结这段需求并给出拆分建议',
        order: 0,
      },
    })
    expect(result).toEqual({
      sessionId: 'session_1',
      messages: [],
      nextAssistantOrder: 1,
    })
  })

  it('persistAssistantMessage 会跳过空白内容，避免写入空消息', async () => {
    const { prisma, service } = createChatSessionsService()

    await service.persistAssistantMessage('session_1', '   ', 3)

    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(prisma.chatSessionMessage.create).not.toHaveBeenCalled()
  })
})
