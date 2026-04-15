import type { CryptoConfig } from '../../config/auth.config'
import type {
  ChatMessageDto,
  ChatModelItemDto,
  ChatRuntimeConfigDto,
  ChatSessionDetailDto,
  ChatSessionSummaryDto,
} from './chat.dto'
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  ChatSessionMessageRole,
  Prisma,
} from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { decryptAes256Gcm, isEncryptedValue } from '../../utils/crypto'

const DEFAULT_CHAT_SESSION_TITLE = '新对话'
const TRAILING_SLASHES_RE = /\/+$/
const LEADING_SLASHES_RE = /^\/+/

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

type PersistedChatSessionSummary = Prisma.ChatSessionGetPayload<{
  select: typeof chatSessionSummarySelect
}>

type PersistedChatSessionDetail = Prisma.ChatSessionGetPayload<{
  select: typeof chatSessionDetailSelect
}>

interface RequestChatCompletionParams {
  userId: string
  sessionId: string
  content: string
  model: string
  systemPrompt?: string | null
}

interface ChatCompletionContext {
  providerResponse: Response
  sessionId: string
  nextAssistantOrder: number
}

interface SystemChatProvider {
  baseUrl: string
  apiKey: string
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name)
  private readonly encryptionKey: string

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    this.encryptionKey = configService.getOrThrow<CryptoConfig>('crypto').encryptionKey
  }

  async getSessions(userId: string): Promise<ChatSessionSummaryDto[]> {
    const sessions = await this.prisma.chatSession.findMany({
      where: { userId },
      select: chatSessionSummarySelect,
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return sessions.map(toChatSessionSummaryDto)
  }

  async createSession(userId: string): Promise<ChatSessionDetailDto> {
    const session = await this.prisma.chatSession.create({
      data: {
        userId,
        title: DEFAULT_CHAT_SESSION_TITLE,
      },
      select: chatSessionDetailSelect,
    })

    return toChatSessionDetailDto(session)
  }

  async getSession(userId: string, sessionId: string): Promise<ChatSessionDetailDto> {
    return toChatSessionDetailDto(await this.findOwnedSessionDetailOrThrow(userId, sessionId))
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

  async getRuntimeConfig(): Promise<ChatRuntimeConfigDto> {
    const config = await this.prisma.systemAiConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    })
    const baseUrl = config?.baseUrl?.trim() || null
    const apiKey = this.decryptStoredApiKey(config?.apiKey ?? null)?.trim() || null

    return {
      enabled: config?.enabled ?? false,
      ready: Boolean(baseUrl && apiKey),
      providerLabel: baseUrl ? this.resolveProviderLabel(baseUrl) : null,
    }
  }

  async getModels(userId: string): Promise<ChatModelItemDto[]> {
    const provider = await this.getSystemProviderOrThrow({
      requireEnabled: false,
    })

    this.logger.log(`chat model list requested: user=${userId} baseUrl=${provider.baseUrl}`)

    const response = await this.fetchProvider(
      this.buildProviderUrl(provider.baseUrl, 'models'),
      {
        method: 'GET',
        headers: this.buildProviderHeaders(provider.apiKey),
        signal: AbortSignal.timeout(10_000),
      },
      '获取模型列表失败',
    )

    if (!response.ok) {
      throw new BadGatewayException(await this.readProviderError(response, '获取模型列表失败'))
    }

    const payload = await this.readJson(response, '模型列表响应格式不正确')
    const models = this.extractModelItems(payload)

    return Array.from(
      new Map(models.map(model => [model.id, model])).values(),
    ).sort((left, right) => left.id.localeCompare(right.id))
  }

  async requestChatCompletion(params: RequestChatCompletionParams): Promise<ChatCompletionContext> {
    const normalizedContent = params.content.trim()
    const normalizedModel = params.model.trim()
    const normalizedSystemPrompt = params.systemPrompt?.trim() || null

    if (!normalizedModel) {
      throw new BadRequestException('请先选择模型')
    }

    const session = await this.findOwnedSessionDetailOrThrow(params.userId, params.sessionId)
    const provider = await this.getSystemProviderOrThrow({
      requireEnabled: true,
    })
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

    this.logger.log(
      `chat completion requested: user=${params.userId} session=${session.id} model=${normalizedModel} baseUrl=${provider.baseUrl} messages=${session.messages.length + 1}`,
    )

    const providerResponse = await this.fetchProvider(
      this.buildProviderUrl(provider.baseUrl, 'chat/completions'),
      {
        method: 'POST',
        headers: {
          ...this.buildProviderHeaders(provider.apiKey),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: normalizedModel,
          messages: [
            ...(normalizedSystemPrompt
              ? [{ role: 'system', content: normalizedSystemPrompt }]
              : []),
            ...session.messages.map(message => ({
              role: toChatMessageRole(message.role),
              content: message.content,
            })),
            {
              role: 'user',
              content: normalizedContent,
            },
          ],
          stream: true,
        }),
        signal: AbortSignal.timeout(10 * 60_000),
      },
      '发起聊天请求失败',
    )

    if (!providerResponse.ok) {
      throw new BadGatewayException(await this.readProviderError(providerResponse, '发起聊天请求失败'))
    }

    if (!providerResponse.body) {
      throw new BadGatewayException('AI 提供商未返回可读取的响应流')
    }

    return {
      providerResponse,
      sessionId: session.id,
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

  async consumeChatCompletionStream(
    response: Response,
    options: {
      onChunk: (chunk: string) => void | Promise<void>
    },
  ): Promise<void> {
    const { onChunk } = options
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const payload = await this.readJson(response, 'AI 提供商响应格式不正确')
      const content = this.extractProviderResponseContent(payload)

      if (!content) {
        throw new BadGatewayException('AI 提供商未返回可解析的消息内容')
      }

      await onChunk(content)
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new BadGatewayException('AI 提供商未返回可读取的响应流')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const event of events) {
          for (const content of this.parseSseEvent(event)) {
            await onChunk(content)
          }
        }
      }

      buffer += decoder.decode()

      if (buffer.trim()) {
        for (const content of this.parseSseEvent(buffer)) {
          await onChunk(content)
        }
      }
    }
    finally {
      reader.releaseLock()
    }
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

  private async getSystemProviderOrThrow(options: { requireEnabled: boolean }): Promise<SystemChatProvider> {
    const config = await this.prisma.systemAiConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    })
    const baseUrl = config?.baseUrl?.trim() || ''
    const apiKey = this.decryptStoredApiKey(config?.apiKey ?? null)?.trim() || ''

    if (!baseUrl) {
      throw new BadRequestException('管理员尚未配置 AI 服务地址')
    }

    if (!apiKey) {
      throw new BadRequestException('管理员尚未保存 AI 服务密钥')
    }

    if (options.requireEnabled && !(config?.enabled ?? false)) {
      throw new BadRequestException('AI 服务暂未开启')
    }

    return {
      baseUrl,
      apiKey,
    }
  }

  private buildProviderHeaders(apiKey: string) {
    return {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    }
  }

  private buildProviderUrl(baseUrl: string, path: string) {
    return `${baseUrl.replace(TRAILING_SLASHES_RE, '')}/${path.replace(LEADING_SLASHES_RE, '')}`
  }

  private decryptStoredApiKey(storedApiKey: string | null | undefined): string | null {
    if (!storedApiKey) {
      return null
    }

    if (!isEncryptedValue(storedApiKey)) {
      return storedApiKey
    }

    return decryptAes256Gcm(storedApiKey, this.encryptionKey)
  }

  private resolveProviderLabel(baseUrl: string) {
    try {
      return new URL(baseUrl).host
    }
    catch {
      return baseUrl
    }
  }

  private async fetchProvider(
    input: string,
    init: RequestInit,
    fallbackMessage: string,
  ) {
    try {
      return await fetch(input, init)
    }
    catch {
      throw new BadGatewayException(`${fallbackMessage}，请检查 API 地址是否可访问`)
    }
  }

  private async readJson(response: Response, fallbackMessage: string) {
    try {
      return await response.json()
    }
    catch {
      throw new BadGatewayException(fallbackMessage)
    }
  }

  private extractModelItems(payload: unknown): ChatModelItemDto[] {
    if (!payload || typeof payload !== 'object' || !('data' in payload) || !Array.isArray(payload.data)) {
      throw new BadGatewayException('模型列表响应格式不正确')
    }

    return payload.data
      .map((item) => {
        if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id.trim()) {
          return null
        }

        const ownedBy = typeof item.owned_by === 'string' && item.owned_by.trim()
          ? item.owned_by.trim()
          : null

        return {
          id: item.id.trim(),
          ownedBy,
        } satisfies ChatModelItemDto
      })
      .filter((item): item is ChatModelItemDto => Boolean(item))
  }

  private parseSseEvent(event: string): string[] {
    const lines = event
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)

    const contents: string[] = []

    for (const line of lines) {
      if (!line.startsWith('data:')) {
        continue
      }

      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') {
        continue
      }

      let parsed: Record<string, any>

      try {
        parsed = JSON.parse(payload) as Record<string, any>
      }
      catch {
        continue
      }

      const providerError = this.extractProviderStreamError(parsed)
      if (providerError) {
        throw new BadGatewayException(providerError)
      }

      const deltaContent = this.extractProviderStreamContent(parsed)
      if (deltaContent) {
        contents.push(deltaContent)
      }
    }

    return contents
  }

  private extractProviderStreamContent(payload: Record<string, any>) {
    const choice = Array.isArray(payload.choices) ? payload.choices[0] : null
    if (!choice || typeof choice !== 'object') {
      return null
    }

    const deltaContent = choice.delta?.content
    return (
      this.normalizeProviderContent(deltaContent)
      ?? this.normalizeProviderContent(choice.message?.content)
      ?? this.normalizeProviderContent(choice.text)
      ?? this.normalizeProviderContent(payload.output_text)
      ?? this.normalizeProviderContent(payload.content)
    )
  }

  private extractProviderStreamError(payload: Record<string, any>) {
    const error = payload.error
    if (!error) {
      return null
    }

    if (typeof error === 'string' && error.trim()) {
      return error.trim()
    }

    if (typeof error === 'object' && typeof error.message === 'string' && error.message.trim()) {
      return error.message.trim()
    }

    return 'AI 提供商返回了错误响应'
  }

  private async readProviderError(response: Response, fallbackMessage: string) {
    if (response.status === 404) {
      return `${fallbackMessage}，当前提供商未开放兼容接口`
    }

    const contentType = response.headers.get('content-type') ?? ''

    try {
      if (contentType.includes('application/json')) {
        const payload = await response.json() as {
          error?: { message?: string }
          message?: string
        }

        const message = payload.error?.message ?? payload.message
        if (message?.trim()) {
          return message.trim()
        }
      }
      else {
        const text = await response.text()
        if (text.trim()) {
          return text.trim()
        }
      }
    }
    catch {
    }

    return `${fallbackMessage}（HTTP ${response.status}）`
  }

  private extractProviderResponseContent(payload: unknown) {
    if (!payload || typeof payload !== 'object') {
      return null
    }

    const record = payload as Record<string, any>
    const choice = Array.isArray(record.choices) ? record.choices[0] : null

    return (
      this.normalizeProviderContent(choice?.message?.content)
      ?? this.normalizeProviderContent(choice?.delta?.content)
      ?? this.normalizeProviderContent(choice?.text)
      ?? this.normalizeProviderContent(record.output_text)
      ?? this.normalizeProviderContent(record.content)
    )
  }

  private normalizeProviderContent(value: unknown): string | null {
    if (typeof value === 'string') {
      return value || null
    }

    if (Array.isArray(value)) {
      const merged = value
        .map((item) => {
          if (typeof item === 'string') {
            return item
          }

          if (!item || typeof item !== 'object') {
            return ''
          }

          if (typeof item.text === 'string') {
            return item.text
          }

          if (typeof item.content === 'string') {
            return item.content
          }

          return ''
        })
        .filter(Boolean)
        .join('')

      return merged || null
    }

    if (value && typeof value === 'object') {
      const record = value as Record<string, any>

      if (typeof record.text === 'string' && record.text) {
        return record.text
      }

      if (typeof record.content === 'string' && record.content) {
        return record.content
      }
    }

    return null
  }
}

function toChatSessionSummaryDto(session: PersistedChatSessionSummary): ChatSessionSummaryDto {
  return {
    id: session.id,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  }
}

function toChatSessionDetailDto(session: PersistedChatSessionDetail): ChatSessionDetailDto {
  return {
    ...toChatSessionSummaryDto(session),
    messages: session.messages.map(message => ({
      role: toChatMessageRole(message.role),
      content: message.content,
    })),
  }
}

function toChatMessageRole(role: ChatSessionMessageRole): ChatMessageDto['role'] {
  return role === ChatSessionMessageRole.USER ? 'user' : 'assistant'
}

function buildChatSessionTitle(content: string) {
  return content.slice(0, 30) + (content.length > 30 ? '...' : '')
}
