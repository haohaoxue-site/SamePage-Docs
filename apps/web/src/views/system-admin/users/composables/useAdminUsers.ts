import type {
  SystemAdminUserItemDto,
  SystemAdminUserStatus,
  SystemAuthGovernanceDto,
} from '@/apis/system-admin'
import { ElMessage } from 'element-plus'
import { reactive, shallowRef } from 'vue'
import {
  getSystemAdminUsers,
  getSystemAuthGovernance,
  updateSystemAdminUserStatus,
  updateSystemAuthGovernance,
} from '@/apis/system-admin'
import { getRequestErrorDisplayMessage } from '@/utils/request-error'

export function useAdminUsers() {
  const users = shallowRef<SystemAdminUserItemDto[]>([])
  const errorMessage = shallowRef('')
  const isLoading = shallowRef(false)
  const isSavingGovernance = shallowRef(false)
  const updatingUserId = shallowRef<string | null>(null)
  const governance = reactive<SystemAuthGovernanceDto>({
    allowPasswordRegistration: false,
    allowGithubRegistration: false,
    allowLinuxDoRegistration: false,
    systemAdminEmail: '',
    systemAdminDisplayName: null,
    systemAdminMustChangePassword: false,
    systemAdminLastLoginAt: null,
    systemAdminPasswordUpdatedAt: null,
  })

  async function loadData() {
    isLoading.value = true
    errorMessage.value = ''

    try {
      const [nextUsers, nextGovernance] = await Promise.all([
        getSystemAdminUsers(),
        getSystemAuthGovernance(),
      ])

      users.value = nextUsers
      applyGovernance(nextGovernance)
    }
    catch (error) {
      errorMessage.value = getRequestErrorDisplayMessage(error, '加载用户管理数据失败')
    }
    finally {
      isLoading.value = false
    }
  }

  async function toggleUserStatus(
    user: SystemAdminUserItemDto,
    nextStatus: SystemAdminUserStatus,
  ) {
    updatingUserId.value = user.id

    try {
      const updated = await updateSystemAdminUserStatus(user.id, {
        status: nextStatus,
      })

      users.value = users.value.map(item =>
        item.id === user.id
          ? {
              ...item,
              status: updated.status,
            }
          : item,
      )
      ElMessage.success(nextStatus === 'ACTIVE' ? '用户已恢复' : '用户已禁用')
    }
    catch (error) {
      ElMessage.error(getRequestErrorDisplayMessage(error, '更新用户状态失败'))
    }
    finally {
      updatingUserId.value = null
    }
  }

  async function saveGovernance() {
    isSavingGovernance.value = true

    try {
      const nextGovernance = await updateSystemAuthGovernance({
        allowPasswordRegistration: governance.allowPasswordRegistration,
        allowGithubRegistration: governance.allowGithubRegistration,
        allowLinuxDoRegistration: governance.allowLinuxDoRegistration,
      })

      applyGovernance(nextGovernance)
      ElMessage.success('认证治理配置已更新')
    }
    catch (error) {
      ElMessage.error(getRequestErrorDisplayMessage(error, '更新认证治理配置失败'))
    }
    finally {
      isSavingGovernance.value = false
    }
  }

  return {
    errorMessage,
    governance,
    isLoading,
    isSavingGovernance,
    loadData,
    saveGovernance,
    toggleUserStatus,
    updatingUserId,
    users,
  }

  function applyGovernance(nextGovernance: SystemAuthGovernanceDto) {
    Object.assign(governance, nextGovernance)
  }
}
