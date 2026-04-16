import type { ChatSession } from './composables/useChat'
import type { ChatMessage, ChatModelItem } from '@/apis/chat'

export interface ChatProviderSettingsDialogProps {
  models: ChatModelItem[]
  isLoadingModels: boolean
}

export interface ChatProviderSettingsDialogEmits {
  refreshModels: []
  save: []
}

export interface ChatSessionSidebarProps {
  sessions: ChatSession[]
  activeSessionId: string | null
}

export interface ChatSessionSidebarEmits {
  create: []
  select: [id: string]
  delete: [id: string]
}

export interface ChatInputBoxProps {
  disabled: boolean
  placeholder?: string
}

export interface ChatInputBoxEmits {
  send: [content: string]
}

export interface ChatMessageListProps {
  messages: ChatMessage[]
  isStreaming: boolean
  isConfigured: boolean
}
