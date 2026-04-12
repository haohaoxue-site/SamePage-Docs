import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
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

export class ChatProviderLookupDto {
  @ApiProperty()
  @IsString()
  @IsUrl({ require_tld: false }, { message: 'baseUrl 必须是合法 URL' })
  baseUrl!: string

  @ApiProperty()
  @IsString()
  @MaxLength(512)
  apiKey!: string
}

export class ChatProviderConfigDto extends ChatProviderLookupDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  model!: string
}

export class GetChatModelsRequestDto {
  @ApiProperty({ type: () => ChatProviderLookupDto })
  @ValidateNested()
  @Type(() => ChatProviderLookupDto)
  provider!: ChatProviderLookupDto
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

export class CreateChatCompletionRequestDto {
  @ApiProperty()
  @IsString()
  sessionId!: string

  @ApiProperty()
  @IsString()
  @MaxLength(40_000)
  content!: string

  @ApiProperty({ type: () => ChatProviderConfigDto })
  @ValidateNested()
  @Type(() => ChatProviderConfigDto)
  provider!: ChatProviderConfigDto

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  systemPrompt?: string | null
}
