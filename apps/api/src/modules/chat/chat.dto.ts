import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator'

export class ChatMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsString()
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant'

  @ApiProperty()
  @IsString()
  @MaxLength(40_000)
  content!: string
}

export class ChatSessionSummaryDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  title!: string

  @ApiProperty()
  createdAt!: Date

  @ApiProperty({ nullable: true })
  createdBy!: string | null

  @ApiProperty()
  updatedAt!: Date

  @ApiProperty({ nullable: true })
  updatedBy!: string | null
}

export class ChatSessionDetailDto extends ChatSessionSummaryDto {
  @ApiProperty({ type: () => [ChatMessageDto] })
  messages!: ChatMessageDto[]
}

export class ChatModelItemDto {
  @ApiProperty()
  id!: string

  @ApiProperty({ nullable: true })
  ownedBy!: string | null
}

export class ChatModelListResponseDto {
  @ApiProperty({ type: () => [ChatModelItemDto] })
  models!: ChatModelItemDto[]
}

export class ChatRuntimeConfigDto {
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
