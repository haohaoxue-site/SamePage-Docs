import type { ChatModelItem } from '@haohaoxue/samepage-domain'

export type {
  ChatMessage,
  ChatModelItem,
  ChatProviderConfig,
  ChatProviderLookup,
  ChatSessionDetail,
  ChatSessionSummary,
} from '@haohaoxue/samepage-domain'

export type ChatModelOption = ChatModelItem

export interface GetChatModelsResponseDto {
  models: ChatModelOption[]
}
