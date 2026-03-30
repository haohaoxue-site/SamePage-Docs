import type {
  GovernanceSummaryDto,
  SystemAdminAuditLogItemDto,
  SystemAdminOverviewDto,
  SystemAdminUserItemDto,
  SystemAiConfigDto,
  UpdateSystemAdminUserResponseDto,
  UpdateSystemAdminUserStatusDto,
  UpdateSystemAdminUserSystemRoleDto,
  UpdateSystemAiConfigDto,
} from './typing'
import { axios } from '@/utils/axios'

export * from './typing'

export function getSystemAdminOverview(): Promise<SystemAdminOverviewDto> {
  return axios.request({
    method: 'get',
    url: '/system-admin/overview',
  })
}

export function listSystemAdminUsers(): Promise<SystemAdminUserItemDto[]> {
  return axios.request({
    method: 'get',
    url: '/system-admin/users',
  })
}

export function updateSystemAdminUserStatus(
  id: string,
  data: UpdateSystemAdminUserStatusDto,
): Promise<UpdateSystemAdminUserResponseDto> {
  return axios.request({
    method: 'patch',
    url: `/system-admin/users/${id}/status`,
    data,
  })
}

export function updateSystemAdminUserRole(
  id: string,
  data: UpdateSystemAdminUserSystemRoleDto,
): Promise<UpdateSystemAdminUserResponseDto> {
  return axios.request({
    method: 'patch',
    url: `/system-admin/users/${id}/system-role`,
    data,
  })
}

export function getSystemAiConfig(): Promise<SystemAiConfigDto> {
  return axios.request({
    method: 'get',
    url: '/system-admin/ai-config',
  })
}

export function updateSystemAiConfig(
  data: UpdateSystemAiConfigDto,
): Promise<SystemAiConfigDto> {
  return axios.request({
    method: 'put',
    url: '/system-admin/ai-config',
    data,
  })
}

export function listSystemAdminAuditLogs(): Promise<SystemAdminAuditLogItemDto[]> {
  return axios.request({
    method: 'get',
    url: '/system-admin/audit-logs',
  })
}

export function getGovernanceSummary(): Promise<GovernanceSummaryDto> {
  return axios.request({
    method: 'get',
    url: '/system-admin/governance/summary',
  })
}
