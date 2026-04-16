import type { ChatModelItem } from '@haohaoxue/samepage-domain'

export type {
  ChatMessage,
  ChatModelItem,
  ChatModelSelection,
  ChatRuntimeConfig,
  ChatSessionDetail,
  ChatSessionSummary,
} from '@haohaoxue/samepage-domain'

export interface GetChatModelsResponse {
  models: ChatModelItem[]
}
