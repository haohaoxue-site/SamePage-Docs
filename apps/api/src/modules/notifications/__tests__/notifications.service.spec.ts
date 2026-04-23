import { describe, expect, it, vi } from 'vitest'
import { NotificationsService } from '../notifications.service'

describe('notificationsService', () => {
  it('getNotificationSummary 会聚合当前用户收到的待处理团队邀请', async () => {
    const teamWorkspaceInvitesService = {
      listPendingWorkspaceInvitesForInvitee: vi.fn().mockResolvedValue([
        {
          id: 'invite_1',
          workspaceId: 'workspace_team_1',
          workspaceName: '产品团队',
          invitee: {
            id: 'user_1',
            email: 'member@example.com',
            displayName: '当前用户',
            avatarUrl: null,
            userCode: 'SP-SELF234',
          },
          status: 'PENDING',
          createdAt: '2026-04-21T10:00:00.000Z',
          updatedAt: '2026-04-21T10:30:00.000Z',
        },
      ]),
    }

    const service = new NotificationsService(teamWorkspaceInvitesService as never)
    const summary = await service.getNotificationSummary('user_1')

    expect(teamWorkspaceInvitesService.listPendingWorkspaceInvitesForInvitee).toHaveBeenCalledWith('user_1')
    expect(summary).toEqual({
      pendingTeamInviteCount: 1,
      pendingTeamInvites: [
        {
          id: 'invite_1',
          workspaceId: 'workspace_team_1',
          workspaceName: '产品团队',
          invitee: {
            id: 'user_1',
            email: 'member@example.com',
            displayName: '当前用户',
            avatarUrl: null,
            userCode: 'SP-SELF234',
          },
          status: 'PENDING',
          createdAt: '2026-04-21T10:00:00.000Z',
          updatedAt: '2026-04-21T10:30:00.000Z',
        },
      ],
    })
  })
})
