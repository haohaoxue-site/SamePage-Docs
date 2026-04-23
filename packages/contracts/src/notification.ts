import { z } from 'zod'
import { WorkspaceInviteSummarySchema } from './workspace'

export const NotificationSummarySchema = z.object({
  pendingTeamInviteCount: z.number().int().min(0),
  pendingTeamInvites: z.array(WorkspaceInviteSummarySchema),
}).strict()
