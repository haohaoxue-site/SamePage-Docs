import type {
  GovernanceSummary,
  SystemAdminAuditLogItem,
  SystemAdminOverview,
  SystemAdminUserItem,
  SystemAiConfig,
  SystemAiServiceStatus,
  SystemAuthGovernance,
  SystemEmailConfig,
  SystemEmailServiceStatus,
  TestSystemEmailConfigRequest,
  TestSystemEmailConfigResponse,
  UpdateSystemAdminUserResponse,
  UpdateSystemAdminUserStatusRequest,
  UpdateSystemAiConfigRequest,
  UpdateSystemAiServiceStatusRequest,
  UpdateSystemAuthGovernanceRequest,
  UpdateSystemEmailConfigRequest,
  UpdateSystemEmailServiceStatusRequest,
} from './typing'
import { axios } from '@/utils/axios'

export * from './typing'

export function getSystemAdminOverview(): Promise<SystemAdminOverview> {
  return axios.request({
    method: 'get',
    url: '/system-admin/overview',
  })
}

export function getSystemAdminUsers(): Promise<SystemAdminUserItem[]> {
  return axios.request({
    method: 'get',
    url: '/system-admin/users',
  })
}

export function updateSystemAdminUserStatus(
  id: string,
  data: UpdateSystemAdminUserStatusRequest,
): Promise<UpdateSystemAdminUserResponse> {
  return axios.request({
    method: 'patch',
    url: `/system-admin/users/${id}/status`,
    data,
  })
}

export function getSystemAuthGovernance(): Promise<SystemAuthGovernance> {
  return axios.request({
    method: 'get',
    url: '/system-admin/auth-governance',
  })
}

export function updateSystemAuthGovernance(
  data: UpdateSystemAuthGovernanceRequest,
): Promise<SystemAuthGovernance> {
  return axios.request({
    method: 'put',
    url: '/system-admin/auth-governance',
    data,
  })
}

export function getSystemEmailConfig(): Promise<SystemEmailConfig> {
  return axios.request({
    method: 'get',
    url: '/system-admin/email-config',
  })
}

export function getSystemEmailServiceStatus(): Promise<SystemEmailServiceStatus> {
  return axios.request({
    method: 'get',
    url: '/system-admin/email-service',
  })
}

export function updateSystemEmailConfig(
  data: UpdateSystemEmailConfigRequest,
): Promise<SystemEmailConfig> {
  return axios.request({
    method: 'put',
    url: '/system-admin/email-config',
    data,
  })
}

export function updateSystemEmailServiceStatus(
  data: UpdateSystemEmailServiceStatusRequest,
): Promise<SystemEmailServiceStatus> {
  return axios.request({
    method: 'patch',
    url: '/system-admin/email-service',
    data,
  })
}

export function testSystemEmailConfig(
  data: TestSystemEmailConfigRequest,
): Promise<TestSystemEmailConfigResponse> {
  return axios.request({
    method: 'post',
    url: '/system-admin/email-config/test',
    data,
  })
}

export function getSystemAiConfig(): Promise<SystemAiConfig> {
  return axios.request({
    method: 'get',
    url: '/system-admin/ai-config',
  })
}

export function getSystemAiServiceStatus(): Promise<SystemAiServiceStatus> {
  return axios.request({
    method: 'get',
    url: '/system-admin/ai-service',
  })
}

export function updateSystemAiConfig(
  data: UpdateSystemAiConfigRequest,
): Promise<SystemAiConfig> {
  return axios.request({
    method: 'put',
    url: '/system-admin/ai-config',
    data,
  })
}

export function updateSystemAiServiceStatus(
  data: UpdateSystemAiServiceStatusRequest,
): Promise<SystemAiServiceStatus> {
  return axios.request({
    method: 'patch',
    url: '/system-admin/ai-service',
    data,
  })
}

export function getSystemAdminAuditLogs(): Promise<SystemAdminAuditLogItem[]> {
  return axios.request({
    method: 'get',
    url: '/system-admin/audit-logs',
  })
}

export function getGovernanceSummary(): Promise<GovernanceSummary> {
  return axios.request({
    method: 'get',
    url: '/system-admin/governance/summary',
  })
}
