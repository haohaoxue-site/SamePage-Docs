import type { CreateChatCompletionRequest } from '@haohaoxue/samepage-domain'
import { Type } from 'class-transformer'
import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator'

export class CreateChatCompletionRequestDto implements CreateChatCompletionRequest {
  @IsString()
  sessionId!: string

  @IsString()
  @MaxLength(40_000)
  content!: string

  @Type(() => String)
  @IsString()
  @MaxLength(100)
  model!: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  systemPrompt?: string | null
}
