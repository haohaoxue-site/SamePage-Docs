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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { ApiRequestResponse } from '../../utils/swagger'
import {
  ChatModelListResponseDto,
  ChatSessionDetailDto,
  ChatSessionSummaryDto,
  CreateChatCompletionRequestDto,
  GetChatModelsRequestDto,
} from './chat.dto'
import { ChatService } from './chat.service'

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name)

  constructor(private readonly chatService: ChatService) {}

  @ApiOperation({ summary: '获取聊天会话列表' })
  @ApiRequestResponse([ChatSessionSummaryDto])
  @Get('sessions')
  async getSessions(
    @CurrentUser() authUser: AuthUserContext,
  ): Promise<ChatSessionSummaryDto[]> {
    return this.chatService.getSessions(authUser.id)
  }

  @ApiOperation({ summary: '创建聊天会话' })
  @ApiRequestResponse(ChatSessionDetailDto)
  @Post('sessions')
  async createSession(
    @CurrentUser() authUser: AuthUserContext,
  ): Promise<ChatSessionDetailDto> {
    return this.chatService.createSession(authUser.id)
  }

  @ApiOperation({ summary: '获取聊天会话详情' })
  @ApiRequestResponse(ChatSessionDetailDto)
  @Get('sessions/:id')
  async getSession(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') sessionId: string,
  ): Promise<ChatSessionDetailDto> {
    return this.chatService.getSession(authUser.id, sessionId)
  }

  @ApiOperation({ summary: '删除聊天会话' })
  @ApiRequestResponse(null)
  @Delete('sessions/:id')
  async deleteSession(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') sessionId: string,
  ): Promise<null> {
    await this.chatService.deleteSession(authUser.id, sessionId)
    return null
  }

  @ApiOperation({ summary: '获取 AI 提供商模型列表' })
  @ApiRequestResponse(ChatModelListResponseDto)
  @Post('models')
  async getModels(
    @CurrentUser() authUser: AuthUserContext,
    @Body() payload: GetChatModelsRequestDto,
  ): Promise<ChatModelListResponseDto> {
    return {
      models: await this.chatService.getModels(authUser.id, payload.provider),
    }
  }

  @ApiOperation({ summary: '流式聊天补全' })
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
      provider: payload.provider,
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

      await this.chatService.persistAssistantMessage(sessionId, assistantContent, nextAssistantOrder)
      hasPersistedAssistantMessage = true
      reply.raw.write('data: [DONE]\n\n')
    }
    catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : '聊天流式响应失败'

      if (!hasPersistedAssistantMessage && assistantContent.trim()) {
        try {
          await this.chatService.persistAssistantMessage(sessionId, assistantContent, nextAssistantOrder)
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
