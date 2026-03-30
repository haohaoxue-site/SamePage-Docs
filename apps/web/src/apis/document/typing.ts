import type {
  CreateDocumentNodeRequest,
  DocumentBase,
  DocumentNodeDetail,
  DocumentTreeSection,
  UpdateDocumentNodeRequest,
} from '@haohaoxue/samepage-domain'

/**
 * Web 端最近文档 DTO。
 */
export type DocumentBaseDto = DocumentBase

/**
 * Web 端文档树 DTO。
 */
export type DocumentTreeDto = DocumentTreeSection[]

/**
 * Web 端文档详情 DTO。
 */
export type DocumentNodeDetailDto = DocumentNodeDetail

/**
 * Web 端创建文档请求 DTO。
 */
export type CreateDocumentNodeDto = CreateDocumentNodeRequest

/**
 * Web 端创建文档响应 DTO。
 */
export type CreateDocumentNodeResponseDto = DocumentNodeDetail

/**
 * Web 端更新文档请求 DTO。
 */
export type SaveDocumentNodeDto = UpdateDocumentNodeRequest

/**
 * Web 端更新文档响应 DTO。
 */
export type SaveDocumentNodeResponseDto = DocumentNodeDetail
