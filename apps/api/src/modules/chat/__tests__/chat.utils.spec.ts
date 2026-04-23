import { ChatSessionMessageRole } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import {
  toChatSessionDetail,
  toChatSessionSummary,
} from '../chat.utils'

describe('chat.utils', () => {
  it('toChatSessionSummary 会把 Date 转成 ISO 字符串', () => {
    expect(toChatSessionSummary({
      id: 'session_1',
      title: '新对话',
      createdAt: new Date('2026-04-21T00:00:00.000Z'),
      updatedAt: new Date('2026-04-22T00:00:00.000Z'),
    })).toEqual({
      id: 'session_1',
      title: '新对话',
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-22T00:00:00.000Z',
    })
  })

  it('toChatSessionDetail 会把消息角色映射成 domain 角色', () => {
    expect(toChatSessionDetail({
      id: 'session_1',
      title: '新对话',
      createdAt: new Date('2026-04-21T00:00:00.000Z'),
      updatedAt: new Date('2026-04-22T00:00:00.000Z'),
      messages: [
        {
          role: ChatSessionMessageRole.USER,
          content: '你好',
        },
        {
          role: ChatSessionMessageRole.ASSISTANT,
          content: '你好，请问有什么可以帮你？',
        },
      ],
    })).toEqual({
      id: 'session_1',
      title: '新对话',
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-22T00:00:00.000Z',
      messages: [
        {
          role: 'user',
          content: '你好',
        },
        {
          role: 'assistant',
          content: '你好，请问有什么可以帮你？',
        },
      ],
    })
  })
})
