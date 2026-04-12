import type {
  GovernanceSummaryDto,
  SystemAdminAuditLogItemDto,
  SystemAdminOverviewDto,
  SystemAdminUserItemDto,
  SystemAiConfigDto,
  SystemAuthGovernanceDto,
  SystemEmailConfigDto,
  TestSystemEmailConfigResponseDto,
  UpdateSystemAdminUserResponseDto,
  UpdateSystemAdminUserStatusDto,
  UpdateSystemAiConfigDto,
  UpdateSystemAuthGovernanceDto,
  UpdateSystemEmailConfigDto,
} from './typing'
import { axios } from '@/utils/axios'

export * from './typing'

export function getSystemAdminOverview(): Promise<SystemAdminOverviewDto> {
  return axios.request({
    method: 'get',
    url: '/system-admin/overview',
  })
}

export function getSystemAdminUsers(): Promise<SystemAdminUserItemDto[]> {
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

export function getSystemAuthGovernance(): Promise<SystemAuthGovernanceDto> {
  return axios.request({
    method: 'get',
    url: '/system-admin/auth-governance',
  })
}

export function updateSystemAuthGovernance(
  data: UpdateSystemAuthGovernanceDto,
): Promise<SystemAuthGovernanceDto> {
  return axios.request({
    method: 'put',
    url: '/system-admin/auth-governance',
    data,
  })
}

export function getSystemEmailConfig(): Promise<SystemEmailConfigDto> {
  return axios.request({
    method: 'get',
    url: '/system-admin/email-config',
  })
}

export function updateSystemEmailConfig(
  data: UpdateSystemEmailConfigDto,
): Promise<SystemEmailConfigDto> {
  return axios.request({
    method: 'put',
    url: '/system-admin/email-config',
    data,
  })
}

export function testSystemEmailConfig(): Promise<TestSystemEmailConfigResponseDto> {
  return axios.request({
    method: 'post',
    url: '/system-admin/email-config/test',
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

export function getSystemAdminAuditLogs(): Promise<SystemAdminAuditLogItemDto[]> {
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
