import type {
  CreateDocumentRequest,
  DocumentDetail,
  DocumentRecent,
  DocumentSection,
  UpdateDocumentRequest,
} from '@haohaoxue/samepage-domain'

/**
 * Web 端最近文档 DTO。
 */
export type DocumentRecentDto = DocumentRecent

/**
 * Web 端文档树 DTO。
 */
export type DocumentDto = DocumentSection[]

/**
 * Web 端文档详情 DTO。
 */
export type DocumentDetailDto = DocumentDetail

/**
 * Web 端创建文档请求 DTO。
 */
export type CreateDocumentDto = CreateDocumentRequest

/**
 * Web 端创建文档响应 DTO。
 */
export type CreateDocumentResponseDto = DocumentDetail

/**
 * Web 端更新文档请求 DTO。
 */
export type UpdateDocumentDto = UpdateDocumentRequest

/**
 * Web 端更新文档响应 DTO。
 */
export type UpdateDocumentResponseDto = DocumentDetail
