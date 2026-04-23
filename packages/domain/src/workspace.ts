import type {
  CreateTeamWorkspaceSchema,
  CreateWorkspaceInviteSchema,
  PersonalWorkspaceSummarySchema,
  TeamWorkspaceSummarySchema,
  TransferTeamWorkspaceOwnershipSchema,
  WorkspaceInviteStatusSchema,
  WorkspaceInviteSummarySchema,
  WorkspaceMemberRoleSchema,
  WorkspaceMemberStatusSchema,
  WorkspaceMemberSummarySchema,
  WorkspaceTypeSchema,
} from '@haohaoxue/samepage-contracts'
import type { z } from 'zod'
import type { IsoDateTimeString } from './common'

export type WorkspaceType = z.infer<typeof WorkspaceTypeSchema>
export type WorkspaceMemberRole = z.infer<typeof WorkspaceMemberRoleSchema>
export type WorkspaceMemberStatus = z.infer<typeof WorkspaceMemberStatusSchema>
export type WorkspaceInviteStatus = z.infer<typeof WorkspaceInviteStatusSchema>
export type WorkspaceMemberSummary = z.infer<typeof WorkspaceMemberSummarySchema>

/**
 * 我的空间对应的个人空间摘要。
 */
export type PersonalWorkspaceSummary = Omit<
  z.infer<typeof PersonalWorkspaceSummarySchema>,
  'createdAt' | 'updatedAt'
> & {
  createdAt: IsoDateTimeString
  updatedAt: IsoDateTimeString
}

/**
 * 用户可见的团队空间摘要。
 */
export type TeamWorkspaceSummary = Omit<
  z.infer<typeof TeamWorkspaceSummarySchema>,
  'joinedAt' | 'createdAt' | 'updatedAt'
> & {
  joinedAt: IsoDateTimeString | null
  createdAt: IsoDateTimeString
  updatedAt: IsoDateTimeString
}

/**
 * 创建团队空间请求。
 */
export type CreateTeamWorkspaceRequest = z.infer<typeof CreateTeamWorkspaceSchema>

/**
 * 创建团队邀请请求。
 */
export type CreateWorkspaceInviteRequest = z.infer<typeof CreateWorkspaceInviteSchema>

/**
 * 转移团队所有权请求。
 */
export type TransferTeamWorkspaceOwnershipRequest = z.infer<typeof TransferTeamWorkspaceOwnershipSchema>

/**
 * 团队邀请摘要。
 */
export type WorkspaceInviteSummary = z.infer<typeof WorkspaceInviteSummarySchema>
