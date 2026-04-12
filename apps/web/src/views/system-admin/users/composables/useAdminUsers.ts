import type {
  SystemAdminUserItemDto,
  SystemAdminUserStatus,
  SystemAuthGovernanceDto,
  UpdateSystemAuthGovernanceDto,
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

export type RegistrationGovernanceField = keyof UpdateSystemAuthGovernanceDto

const governanceFieldLabels: Record<RegistrationGovernanceField, string> = {
  allowPasswordRegistration: '邮箱密码注册',
  allowGithubRegistration: 'GitHub 注册',
  allowLinuxDoRegistration: 'LinuxDo 注册',
}

export function useAdminUsers() {
  const users = shallowRef<SystemAdminUserItemDto[]>([])
  const errorMessage = shallowRef('')
  const isLoading = shallowRef(false)
  const updatingUserId = shallowRef<string | null>(null)
  const savingGovernanceFields = reactive<Record<RegistrationGovernanceField, boolean>>({
    allowPasswordRegistration: false,
    allowGithubRegistration: false,
    allowLinuxDoRegistration: false,
  })
  const governance = reactive<SystemAuthGovernanceDto>({
    allowPasswordRegistration: false,
    allowGithubRegistration: false,
    allowLinuxDoRegistration: false,
    emailServiceEnabled: false,
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

  async function updateGovernanceOption(
    field: RegistrationGovernanceField,
    nextValue: boolean,
  ) {
    const previousValue = governance[field]
    governance[field] = nextValue
    savingGovernanceFields[field] = true

    try {
      const nextGovernance = await updateSystemAuthGovernance({
        [field]: nextValue,
      })

      applyGovernance(nextGovernance)
      ElMessage.success(`${governanceFieldLabels[field]}已更新`)
    }
    catch (error) {
      governance[field] = previousValue
      ElMessage.error(getRequestErrorDisplayMessage(error, `更新${governanceFieldLabels[field]}失败`))
    }
    finally {
      savingGovernanceFields[field] = false
    }
  }

  return {
    errorMessage,
    governance,
    isLoading,
    loadData,
    savingGovernanceFields,
    toggleUserStatus,
    updateGovernanceOption,
    updatingUserId,
    users,
  }

  function applyGovernance(nextGovernance: SystemAuthGovernanceDto) {
    Object.assign(governance, nextGovernance)
  }
}
