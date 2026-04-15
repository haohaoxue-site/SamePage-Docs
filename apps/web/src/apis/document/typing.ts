import type {
  CreateDocumentRequest,
  CreateDocumentResponse,
  CreateDocumentSnapshotRequest,
  CreateDocumentSnapshotResponse,
  DocumentHead,
  DocumentRecent,
  DocumentSnapshot,
  DocumentTreeGroup,
  PatchDocumentMetaRequest,
  RestoreDocumentSnapshotRequest,
} from '@haohaoxue/samepage-domain'

/**
 * Web 端最近文档 DTO。
 */
export type DocumentRecentDto = DocumentRecent

/**
 * Web 端文档树 DTO。
 */
export type DocumentDto = DocumentTreeGroup[]

/**
 * Web 端文档 head DTO。
 */
export type DocumentHeadDto = DocumentHead

/**
 * Web 端文档快照 DTO。
 */
export type DocumentSnapshotDto = DocumentSnapshot

/**
 * Web 端创建文档请求 DTO。
 */
export type CreateDocumentDto = CreateDocumentRequest

/**
 * Web 端创建文档响应 DTO。
 */
export type CreateDocumentResponseDto = CreateDocumentResponse

/**
 * Web 端创建 snapshot 请求 DTO。
 */
export type CreateDocumentSnapshotDto = CreateDocumentSnapshotRequest

/**
 * Web 端创建 snapshot 响应 DTO。
 */
export type CreateDocumentSnapshotResponseDto = CreateDocumentSnapshotResponse

/**
 * Web 端恢复 snapshot 请求 DTO。
 */
export type RestoreDocumentSnapshotDto = RestoreDocumentSnapshotRequest

/**
 * Web 端文档元数据补丁 DTO。
 */
export type PatchDocumentMetaDto = PatchDocumentMetaRequest
