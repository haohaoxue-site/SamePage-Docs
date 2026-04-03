import type {
  ChatModelItem,
  ChatMessage as DomainChatMessage,
  ChatProviderConfig as DomainChatProviderConfig,
  ChatProviderLookup as DomainChatProviderLookup,
  ChatSessionDetail as DomainChatSessionDetail,
  ChatSessionSummary as DomainChatSessionSummary,
} from '@haohaoxue/samepage-domain'

/**
 * Web 端聊天消息模型。
 */
export type ChatMessage = DomainChatMessage

/**
 * Web 端聊天会话摘要模型。
 */
export type ChatSessionSummary = DomainChatSessionSummary

/**
 * Web 端聊天会话详情模型。
 */
export type ChatSessionDetail = DomainChatSessionDetail

/**
 * Web 端 AI 提供商基础连接配置。
 */
export type ChatProviderLookup = DomainChatProviderLookup

/**
 * Web 端 AI 提供商完整聊天配置。
 */
export type ChatProviderConfig = DomainChatProviderConfig

/**
 * Web 端 AI 提供商模型选项。
 */
export type ChatModelOption = ChatModelItem

/**
 * Web 端获取模型列表响应 DTO。
 */
export interface GetChatModelsResponseDto {
  models: ChatModelOption[]
}
