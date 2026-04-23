import type {
  CreateDirectDocumentShareSchema,
  DOCUMENT_SHARE_INHERIT_MODE,
  DOCUMENT_SHARE_INHERIT_MODE_OPTION,
  DOCUMENT_SHARE_MODE_ICON_NAMES,
  DocumentPublicShareInfoSchema,
  DocumentPublicShareSchema,
  DocumentShareAccessSchema,
  DocumentShareAccessSourceSchema,
  DocumentShareModeSchema,
  DocumentSharePermissionSchema,
  DocumentShareRecipientSchema,
  DocumentShareRecipientStatusSchema,
  DocumentShareRecipientSummarySchema,
  DocumentShareSchema,
  DocumentShareStatusSchema,
} from '@haohaoxue/samepage-contracts'
import type { z } from 'zod'

export type DocumentShareMode = z.infer<typeof DocumentShareModeSchema>
export type DocumentShareStatus = z.infer<typeof DocumentShareStatusSchema>
export type DocumentSharePermission = z.infer<typeof DocumentSharePermissionSchema>
export type DocumentShareRecipientStatus = z.infer<typeof DocumentShareRecipientStatusSchema>
export type DocumentShareAccessSource = z.infer<typeof DocumentShareAccessSourceSchema>
export type DocumentShareModeIconName = typeof DOCUMENT_SHARE_MODE_ICON_NAMES[DocumentShareMode]
export type DocumentShareInheritMode = typeof DOCUMENT_SHARE_INHERIT_MODE
export type DocumentShareDialogMode = DocumentShareMode | DocumentShareInheritMode
export type DocumentShareDialogModeIconName = DocumentShareModeIconName | typeof DOCUMENT_SHARE_INHERIT_MODE_OPTION.icon
export type CreateDirectDocumentShareRequest = z.infer<typeof CreateDirectDocumentShareSchema>
export type DocumentShare = z.infer<typeof DocumentShareSchema>
export type DocumentPublicShare = z.infer<typeof DocumentPublicShareSchema>
export type DocumentPublicShareInfo = z.infer<typeof DocumentPublicShareInfoSchema>
export type DocumentShareRecipient = z.infer<typeof DocumentShareRecipientSchema>
export type DocumentShareRecipientSummary = z.infer<typeof DocumentShareRecipientSummarySchema>
export type DocumentShareAccess = z.infer<typeof DocumentShareAccessSchema>

/**
 * 分享方式选项。
 */
export interface DocumentShareModeOption {
  /** 展示文案 */
  label: string
  /** 分享方式值 */
  value: DocumentShareDialogMode
  /** 图标名称 */
  icon: DocumentShareDialogModeIconName
}

/**
 * 分享权限选项。
 */
export interface DocumentSharePermissionOption {
  /** 展示文案 */
  label: string
  /** 分享权限值 */
  value: DocumentSharePermission
  /** 是否禁用 */
  disabled?: boolean
}
