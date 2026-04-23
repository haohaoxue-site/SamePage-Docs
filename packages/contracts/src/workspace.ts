import { z } from 'zod'
import { UserCodeSchema, UserCollabIdentitySchema } from './user'

export const WORKSPACE_NAME_MAX_LENGTH = 80
export const WORKSPACE_DESCRIPTION_MAX_LENGTH = 200
export const WORKSPACE_ICON_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const
export const WORKSPACE_ICON_MAX_BYTES = 2 * 1024 * 1024

export const WORKSPACE_TYPE = {
  PERSONAL: 'PERSONAL',
  TEAM: 'TEAM',
} as const

export const WORKSPACE_TYPE_VALUES = [
  WORKSPACE_TYPE.PERSONAL,
  WORKSPACE_TYPE.TEAM,
] as const

export const WORKSPACE_MEMBER_ROLE = {
  OWNER: 'OWNER',
  MEMBER: 'MEMBER',
} as const

export const WORKSPACE_MEMBER_ROLE_VALUES = [
  WORKSPACE_MEMBER_ROLE.OWNER,
  WORKSPACE_MEMBER_ROLE.MEMBER,
] as const

export const WORKSPACE_MEMBER_STATUS = {
  ACTIVE: 'ACTIVE',
  LEFT: 'LEFT',
  REMOVED: 'REMOVED',
} as const

export const WORKSPACE_MEMBER_STATUS_VALUES = [
  WORKSPACE_MEMBER_STATUS.ACTIVE,
  WORKSPACE_MEMBER_STATUS.LEFT,
  WORKSPACE_MEMBER_STATUS.REMOVED,
] as const

export const WORKSPACE_INVITE_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  CANCELED: 'CANCELED',
} as const

export const WORKSPACE_INVITE_STATUS_VALUES = [
  WORKSPACE_INVITE_STATUS.PENDING,
  WORKSPACE_INVITE_STATUS.ACCEPTED,
  WORKSPACE_INVITE_STATUS.DECLINED,
  WORKSPACE_INVITE_STATUS.CANCELED,
] as const

export const WorkspaceTypeSchema = z.enum(WORKSPACE_TYPE_VALUES)
export const WorkspaceMemberRoleSchema = z.enum(WORKSPACE_MEMBER_ROLE_VALUES)
export const WorkspaceMemberStatusSchema = z.enum(WORKSPACE_MEMBER_STATUS_VALUES)
export const WorkspaceInviteStatusSchema = z.enum(WORKSPACE_INVITE_STATUS_VALUES)

export const CreateTeamWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(WORKSPACE_NAME_MAX_LENGTH),
  description: z.string().trim().max(WORKSPACE_DESCRIPTION_MAX_LENGTH).optional(),
}).strict()

export const CreateWorkspaceInviteSchema = z.object({
  userCode: UserCodeSchema.or(z.string().trim().min(1).max(32)),
}).strict()

export const TransferTeamWorkspaceOwnershipSchema = z.object({
  nextOwnerUserId: z.string().trim().min(1),
}).strict()

export const PersonalWorkspaceSummarySchema = z.object({
  id: z.string(),
  type: WorkspaceTypeSchema.extract(['PERSONAL']),
  name: z.string(),
  description: z.string().nullable(),
  iconUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).strict()

export const TeamWorkspaceSummarySchema = z.object({
  id: z.string(),
  type: WorkspaceTypeSchema.extract(['TEAM']),
  name: z.string(),
  description: z.string().nullable(),
  iconUrl: z.string().nullable(),
  slug: z.string(),
  role: WorkspaceMemberRoleSchema,
  status: WorkspaceMemberStatusSchema,
  joinedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).strict()

export const WorkspaceMemberSummarySchema = z.object({
  user: UserCollabIdentitySchema,
  role: WorkspaceMemberRoleSchema,
  status: WorkspaceMemberStatusSchema,
  joinedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).strict()

export const WorkspaceInviteSummarySchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  workspaceName: z.string(),
  invitee: UserCollabIdentitySchema,
  status: WorkspaceInviteStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
}).strict()
