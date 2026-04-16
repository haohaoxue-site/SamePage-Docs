import type {
  ChatMessage,
  ChatModelItem,
  ChatRuntimeConfig,
  ChatSessionDetail,
  ChatSessionSummary,
} from './chat.interface'
import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator'

export class ChatMessageDto implements ChatMessage {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsString()
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant'

  @ApiProperty()
  @IsString()
  @MaxLength(40_000)
  content!: string
}

export class ChatSessionSummaryDto implements ChatSessionSummary {
  @ApiProperty()
  id!: string

  @ApiProperty()
  title!: string

  @ApiProperty()
  createdAt!: Date

  @ApiProperty()
  updatedAt!: Date
}

export class ChatSessionDetailDto extends ChatSessionSummaryDto implements ChatSessionDetail {
  @ApiProperty({ type: () => [ChatMessageDto] })
  messages!: ChatMessageDto[]
}

export class ChatModelItemDto implements ChatModelItem {
  @ApiProperty()
  id!: string

  @ApiProperty({ nullable: true })
  ownedBy!: string | null
}

export class ChatModelListResponseDto {
  @ApiProperty({ type: () => [ChatModelItemDto] })
  models!: ChatModelItemDto[]
}

export class ChatRuntimeConfigDto implements ChatRuntimeConfig {
  @ApiProperty()
  @IsBoolean()
  enabled!: boolean

  @ApiProperty()
  @IsBoolean()
  ready!: boolean

  @ApiProperty({ nullable: true })
  providerLabel!: string | null
}

export class CreateChatCompletionRequestDto {
  @ApiProperty()
  @IsString()
  sessionId!: string

  @ApiProperty()
  @IsString()
  @MaxLength(40_000)
  content!: string

  @ApiProperty()
  @Type(() => String)
  @IsString()
  @MaxLength(100)
  model!: string

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  systemPrompt?: string | null
}
