import type {
  ChatSessionDetail,
  ChatSessionSummary,
} from '@haohaoxue/samepage-domain'
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  ChatSessionMessageRole,
  Prisma,
} from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import {
  toChatSessionDetail,
  toChatSessionSummary,
} from './chat.utils'

const DEFAULT_CHAT_SESSION_TITLE = '新对话'

const chatSessionSummarySelect = {
  id: true,
  title: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ChatSessionSelect

const chatSessionDetailSelect = {
  ...chatSessionSummarySelect,
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
} satisfies Prisma.ChatSessionSelect

type PersistedChatSessionDetail = Prisma.ChatSessionGetPayload<{
  select: typeof chatSessionDetailSelect
}>

/**
 * completion 前会话上下文。
 */
export interface ChatCompletionSessionContext {
  sessionId: string
  messages: Array<{
    role: ChatSessionMessageRole
    content: string
  }>
  nextAssistantOrder: number
}

@Injectable()
export class ChatSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSessions(userId: string): Promise<ChatSessionSummary[]> {
    const sessions = await this.prisma.chatSession.findMany({
      where: { userId },
      select: chatSessionSummarySelect,
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return sessions.map(toChatSessionSummary)
  }

  async createSession(userId: string): Promise<ChatSessionDetail> {
    const session = await this.prisma.chatSession.create({
      data: {
        userId,
        title: DEFAULT_CHAT_SESSION_TITLE,
      },
      select: chatSessionDetailSelect,
    })

    return toChatSessionDetail(session)
  }

  async getSession(userId: string, sessionId: string): Promise<ChatSessionDetail> {
    return toChatSessionDetail(await this.findOwnedSessionDetailOrThrow(userId, sessionId))
  }

  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const result = await this.prisma.chatSession.deleteMany({
      where: {
        id: sessionId,
        userId,
      },
    })

    if (result.count === 0) {
      throw new NotFoundException('聊天会话不存在')
    }
  }

  async prepareCompletionSession(input: {
    userId: string
    sessionId: string
    content: string
  }): Promise<ChatCompletionSessionContext> {
    const session = await this.findOwnedSessionDetailOrThrow(input.userId, input.sessionId)
    const normalizedContent = input.content.trim()
    const nextUserOrder = (session.messages.at(-1)?.order ?? -1) + 1
    const nextAssistantOrder = nextUserOrder + 1
    const nextTitle = session.messages.length === 0
      ? buildChatSessionTitle(normalizedContent)
      : session.title

    await this.prisma.$transaction([
      this.prisma.chatSession.update({
        where: { id: session.id },
        data: {
          title: nextTitle,
          updatedAt: new Date(),
        },
      }),
      this.prisma.chatSessionMessage.create({
        data: {
          sessionId: session.id,
          role: ChatSessionMessageRole.USER,
          content: normalizedContent,
          order: nextUserOrder,
        },
      }),
    ])

    return {
      sessionId: session.id,
      messages: session.messages.map(message => ({
        role: message.role,
        content: message.content,
      })),
      nextAssistantOrder,
    }
  }

  async persistAssistantMessage(
    sessionId: string,
    assistantContent: string,
    order: number,
  ): Promise<void> {
    const normalizedContent = assistantContent.trim()
    if (!normalizedContent) {
      return
    }

    await this.prisma.$transaction([
      this.prisma.chatSession.update({
        where: { id: sessionId },
        data: {
          updatedAt: new Date(),
        },
      }),
      this.prisma.chatSessionMessage.create({
        data: {
          sessionId,
          role: ChatSessionMessageRole.ASSISTANT,
          content: normalizedContent,
          order,
        },
      }),
    ])
  }

  private async findOwnedSessionDetailOrThrow(
    userId: string,
    sessionId: string,
  ): Promise<PersistedChatSessionDetail> {
    const session = await this.prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      select: chatSessionDetailSelect,
    })

    if (!session) {
      throw new NotFoundException('聊天会话不存在')
    }

    return session
  }
}

function buildChatSessionTitle(content: string) {
  return content.slice(0, 30) + (content.length > 30 ? '...' : '')
}
