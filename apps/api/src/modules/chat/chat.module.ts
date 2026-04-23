import { Module } from '@nestjs/common'
import { ChatSessionsService } from './chat-sessions.service'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'

@Module({
  controllers: [ChatController],
  providers: [ChatService, ChatSessionsService],
})
export class ChatModule {}
