export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatSessionSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface ChatSessionDetail extends ChatSessionSummary {
  messages: ChatMessage[]
}

export interface ChatProviderLookup {
  baseUrl: string
  apiKey: string
}

export interface ChatProviderConfig extends ChatProviderLookup {
  model: string
}

export interface ChatModelItem {
  id: string
  ownedBy: string | null
}

export interface CreateChatCompletionRequest {
  sessionId: string
  content: string
  provider: ChatProviderConfig
  systemPrompt?: string | null
}
