import { z } from 'zod'
import { AuditUserSummarySchema, UserCodeSchema, UserCollabIdentitySchema } from './user'
import { WorkspaceTypeSchema } from './workspace'

export const DOCUMENT_SHARE_MODE = {
  NONE: 'NONE',
  DIRECT_USER: 'DIRECT_USER',
  PUBLIC_TO_LOGGED_IN: 'PUBLIC_TO_LOGGED_IN',
} as const

export const DOCUMENT_SHARE_MODE_VALUES = [
  DOCUMENT_SHARE_MODE.NONE,
  DOCUMENT_SHARE_MODE.DIRECT_USER,
  DOCUMENT_SHARE_MODE.PUBLIC_TO_LOGGED_IN,
] as const

export const DOCUMENT_SHARE_MODE_LABELS = {
  [DOCUMENT_SHARE_MODE.NONE]: '不分享',
  [DOCUMENT_SHARE_MODE.DIRECT_USER]: '指定成员',
  [DOCUMENT_SHARE_MODE.PUBLIC_TO_LOGGED_IN]: '互联网公开',
} as const satisfies Record<(typeof DOCUMENT_SHARE_MODE_VALUES)[number], string>

export const DOCUMENT_SHARE_MODE_ICON_NAMES = {
  [DOCUMENT_SHARE_MODE.NONE]: 'share-none',
  [DOCUMENT_SHARE_MODE.DIRECT_USER]: 'share-direct',
  [DOCUMENT_SHARE_MODE.PUBLIC_TO_LOGGED_IN]: 'share-public',
} as const satisfies Record<(typeof DOCUMENT_SHARE_MODE_VALUES)[number], string>

export const DOCUMENT_SHARE_MODE_OPTIONS = [
  {
    label: DOCUMENT_SHARE_MODE_LABELS[DOCUMENT_SHARE_MODE.NONE],
    value: DOCUMENT_SHARE_MODE.NONE,
    icon: DOCUMENT_SHARE_MODE_ICON_NAMES[DOCUMENT_SHARE_MODE.NONE],
  },
  {
    label: DOCUMENT_SHARE_MODE_LABELS[DOCUMENT_SHARE_MODE.DIRECT_USER],
    value: DOCUMENT_SHARE_MODE.DIRECT_USER,
    icon: DOCUMENT_SHARE_MODE_ICON_NAMES[DOCUMENT_SHARE_MODE.DIRECT_USER],
  },
  {
    label: DOCUMENT_SHARE_MODE_LABELS[DOCUMENT_SHARE_MODE.PUBLIC_TO_LOGGED_IN],
    value: DOCUMENT_SHARE_MODE.PUBLIC_TO_LOGGED_IN,
    icon: DOCUMENT_SHARE_MODE_ICON_NAMES[DOCUMENT_SHARE_MODE.PUBLIC_TO_LOGGED_IN],
  },
] as const

export const DOCUMENT_SHARE_INHERIT_MODE = 'INHERIT' as const

export const DOCUMENT_SHARE_INHERIT_MODE_OPTION = {
  label: '继承父级',
  value: DOCUMENT_SHARE_INHERIT_MODE,
  icon: 'share-inherit',
} as const

export const DOCUMENT_SHARE_STATUS = {
  ACTIVE: 'ACTIVE',
  REMOVED: 'REMOVED',
} as const

export const DOCUMENT_SHARE_STATUS_VALUES = [
  DOCUMENT_SHARE_STATUS.ACTIVE,
  DOCUMENT_SHARE_STATUS.REMOVED,
] as const

export const DOCUMENT_SHARE_PERMISSION = {
  VIEW: 'VIEW',
  COMMENT: 'COMMENT',
} as const

export const DOCUMENT_SHARE_PERMISSION_VALUES = [
  DOCUMENT_SHARE_PERMISSION.VIEW,
  DOCUMENT_SHARE_PERMISSION.COMMENT,
] as const

export const DOCUMENT_SHARE_PERMISSION_LABELS = {
  [DOCUMENT_SHARE_PERMISSION.VIEW]: '可查看',
  [DOCUMENT_SHARE_PERMISSION.COMMENT]: '可评论',
} as const satisfies Record<(typeof DOCUMENT_SHARE_PERMISSION_VALUES)[number], string>

export const DOCUMENT_SHARE_RECIPIENT_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  DECLINED: 'DECLINED',
  EXITED: 'EXITED',
  REMOVED: 'REMOVED',
} as const

export const DOCUMENT_SHARE_RECIPIENT_STATUS_VALUES = [
  DOCUMENT_SHARE_RECIPIENT_STATUS.PENDING,
  DOCUMENT_SHARE_RECIPIENT_STATUS.ACTIVE,
  DOCUMENT_SHARE_RECIPIENT_STATUS.DECLINED,
  DOCUMENT_SHARE_RECIPIENT_STATUS.EXITED,
  DOCUMENT_SHARE_RECIPIENT_STATUS.REMOVED,
] as const

export const DOCUMENT_SHARE_ROUTE_PREFIX = '/shared'

export const DocumentShareModeSchema = z.enum(DOCUMENT_SHARE_MODE_VALUES)
export const DocumentShareStatusSchema = z.enum(DOCUMENT_SHARE_STATUS_VALUES)
export const DocumentSharePermissionSchema = z.enum(DOCUMENT_SHARE_PERMISSION_VALUES)
export const DocumentShareRecipientStatusSchema = z.enum(DOCUMENT_SHARE_RECIPIENT_STATUS_VALUES)

export const ConfirmDocumentShareInheritanceUnlinkSchema = z.object({
  confirmUnlinkInheritance: z.boolean().optional(),
}).strict()

export const CreateDirectDocumentShareSchema = z.object({
  userCode: UserCodeSchema.or(z.string().trim().min(1).max(32)),
  confirmUnlinkInheritance: z.boolean().optional(),
}).strict()

export const DocumentShareSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  mode: DocumentShareModeSchema,
  permission: DocumentSharePermissionSchema,
  status: DocumentShareStatusSchema,
  createdAt: z.string(),
  createdBy: z.string().nullable(),
  createdByUser: AuditUserSummarySchema.nullable(),
  updatedAt: z.string(),
  updatedBy: z.string().nullable(),
  updatedByUser: AuditUserSummarySchema.nullable(),
}).strict()

export const DocumentPublicShareSchema = DocumentShareSchema.extend({
  link: z.string(),
}).strict()

export const DocumentPublicShareInfoSchema = z.object({
  share: DocumentPublicShareSchema.nullable(),
}).strict()

export const DocumentShareRecipientSchema = z.object({
  id: z.string(),
  documentShareId: z.string(),
  recipientUserId: z.string(),
  permission: DocumentSharePermissionSchema,
  status: DocumentShareRecipientStatusSchema,
  createdAt: z.string(),
  createdBy: z.string().nullable(),
  createdByUser: AuditUserSummarySchema.nullable(),
  updatedAt: z.string(),
  updatedBy: z.string().nullable(),
  updatedByUser: AuditUserSummarySchema.nullable(),
}).strict()

const DocumentShareAccessShareSchema = DocumentShareSchema.extend({
  link: z.string().optional(),
}).strict()

export const DOCUMENT_SHARE_ACCESS_SOURCE = {
  OWNER: 'OWNER',
  WORKSPACE_MEMBER: 'WORKSPACE_MEMBER',
  DIRECT_SHARE: 'DIRECT_SHARE',
  PUBLIC_SHARE: 'PUBLIC_SHARE',
} as const

export const DOCUMENT_SHARE_ACCESS_SOURCE_VALUES = [
  DOCUMENT_SHARE_ACCESS_SOURCE.OWNER,
  DOCUMENT_SHARE_ACCESS_SOURCE.WORKSPACE_MEMBER,
  DOCUMENT_SHARE_ACCESS_SOURCE.DIRECT_SHARE,
  DOCUMENT_SHARE_ACCESS_SOURCE.PUBLIC_SHARE,
] as const

export const DocumentShareAccessSourceSchema = z.enum(DOCUMENT_SHARE_ACCESS_SOURCE_VALUES)

export const DocumentShareRecipientSummarySchema = z.object({
  recipient: DocumentShareRecipientSchema,
  recipientUser: UserCollabIdentitySchema,
  sharedByUser: UserCollabIdentitySchema.nullable(),
  share: DocumentShareSchema,
  documentId: z.string(),
  documentTitle: z.string(),
  workspaceName: z.string(),
  workspaceType: WorkspaceTypeSchema,
  link: z.string(),
}).strict()

export const DocumentShareAccessSchema = z.object({
  accessSource: DocumentShareAccessSourceSchema,
  permission: DocumentSharePermissionSchema,
  authorizationRootDocumentId: z.string(),
  authorizationShareId: z.string().nullable(),
  authorizationRecipientId: z.string().nullable(),
  entryShareId: z.string().nullable(),
  entryRecipientId: z.string().nullable(),
  canEditTree: z.boolean(),
  share: DocumentShareAccessShareSchema,
  recipient: DocumentShareRecipientSchema.nullable(),
  recipientStatus: DocumentShareRecipientStatusSchema,
  sharedByUser: UserCollabIdentitySchema.nullable(),
  documentId: z.string(),
  documentTitle: z.string(),
  workspaceName: z.string(),
  workspaceType: WorkspaceTypeSchema,
}).strict()
