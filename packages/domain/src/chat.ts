import type { IsoDateTimeString } from './common'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatSessionSummary {
  id: string
  title: string
  createdAt: IsoDateTimeString
  updatedAt: IsoDateTimeString
}

export interface ChatSessionDetail extends ChatSessionSummary {
  messages: ChatMessage[]
}

export interface ChatModelSelection {
  model: string
}

export interface ChatModelItem {
  id: string
  ownedBy: string | null
}

export interface ChatModelListResponse {
  models: ChatModelItem[]
}

export interface ChatRuntimeConfig {
  enabled: boolean
  ready: boolean
  providerLabel: string | null
}

export interface CreateChatCompletionRequest {
  sessionId: string
  content: string
  model: string
  systemPrompt?: string | null
}
