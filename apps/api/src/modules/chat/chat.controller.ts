import type {
  ChatModelListResponse,
  ChatRuntimeConfig,
  ChatSessionDetail,
  ChatSessionSummary,
} from '@haohaoxue/samepage-domain'
import type { FastifyReply } from 'fastify'
import type { AuthUserContext } from '../auth/auth.interface'
import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Res,
} from '@nestjs/common'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { ChatSessionsService } from './chat-sessions.service'
import { CreateChatCompletionRequestDto } from './chat.dto'
import { ChatService } from './chat.service'

@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name)

  constructor(
    private readonly chatService: ChatService,
    private readonly chatSessionsService: ChatSessionsService,
  ) {}

  @Get('sessions')
  async getSessions(
    @CurrentUser() authUser: AuthUserContext,
  ): Promise<ChatSessionSummary[]> {
    return this.chatSessionsService.getSessions(authUser.id)
  }

  @Post('sessions')
  async createSession(
    @CurrentUser() authUser: AuthUserContext,
  ): Promise<ChatSessionDetail> {
    return this.chatSessionsService.createSession(authUser.id)
  }

  @Get('sessions/:id')
  async getSession(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') sessionId: string,
  ): Promise<ChatSessionDetail> {
    return this.chatSessionsService.getSession(authUser.id, sessionId)
  }

  @Delete('sessions/:id')
  async deleteSession(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') sessionId: string,
  ): Promise<null> {
    await this.chatSessionsService.deleteSession(authUser.id, sessionId)
    return null
  }

  @Get('config')
  async getRuntimeConfig(): Promise<ChatRuntimeConfig> {
    return this.chatService.getRuntimeConfig()
  }

  @Get('models')
  async getModels(
    @CurrentUser() authUser: AuthUserContext,
  ): Promise<ChatModelListResponse> {
    return {
      models: await this.chatService.getModels(authUser.id),
    }
  }

  @Post('completions')
  async createCompletion(
    @CurrentUser() authUser: AuthUserContext,
    @Body() payload: CreateChatCompletionRequestDto,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const { nextAssistantOrder, providerResponse, sessionId } = await this.chatService.requestChatCompletion({
      userId: authUser.id,
      sessionId: payload.sessionId,
      content: payload.content,
      model: payload.model,
      systemPrompt: payload.systemPrompt,
    })

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    let assistantContent = ''
    let hasPersistedAssistantMessage = false

    try {
      await this.chatService.consumeChatCompletionStream(providerResponse, {
        onChunk: (chunk) => {
          assistantContent += chunk
          reply.raw.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
        },
      })

      await this.chatSessionsService.persistAssistantMessage(sessionId, assistantContent, nextAssistantOrder)
      hasPersistedAssistantMessage = true
      reply.raw.write('data: [DONE]\n\n')
    }
    catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : '聊天流式响应失败'

      if (!hasPersistedAssistantMessage && assistantContent.trim()) {
        try {
          await this.chatSessionsService.persistAssistantMessage(sessionId, assistantContent, nextAssistantOrder)
          hasPersistedAssistantMessage = true
        }
        catch (persistError) {
          this.logger.error(
            persistError instanceof Error ? persistError.message : 'persist assistant message failed after chat stream error',
            persistError instanceof Error ? persistError.stack : undefined,
          )
        }
      }

      this.logger.error(
        error instanceof Error ? error.message : 'chat completion stream failed',
        error instanceof Error ? error.stack : undefined,
      )
      reply.raw.write(`data: ${JSON.stringify({ error: message })}\n\n`)
    }
    finally {
      reply.raw.end()
    }
  }
}
