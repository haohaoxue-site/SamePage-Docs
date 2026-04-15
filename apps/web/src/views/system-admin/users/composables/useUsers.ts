import type {
  SystemAdminUserItemDto,
  SystemAdminUserStatus,
  SystemAuthGovernanceDto,
  UpdateSystemAuthGovernanceDto,
} from '@/apis/system-admin'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, shallowRef } from 'vue'
import {
  getSystemAdminUsers,
  getSystemAuthGovernance,
  updateSystemAdminUserStatus,
  updateSystemAuthGovernance,
} from '@/apis/system-admin'
import { SvgIconCategory } from '@/components/svg-icon/typing'
import { formatDateTime } from '@/utils/dayjs'
import { getRequestErrorDisplayMessage } from '@/utils/request-error'

export type RegistrationGovernanceField = keyof UpdateSystemAuthGovernanceDto

const governanceFieldLabels: Record<RegistrationGovernanceField, string> = {
  allowPasswordRegistration: '邮箱密码注册',
  allowGithubRegistration: 'GitHub 注册',
  allowLinuxDoRegistration: 'LinuxDo 注册',
}

const registrationSwitches = [
  {
    key: 'allowPasswordRegistration',
    label: '邮箱密码注册',
    description: '控制新的邮箱密码账号是否允许注册。',
  },
  {
    key: 'allowGithubRegistration',
    label: 'GitHub 注册',
    description: '控制新的 GitHub 账号是否允许首次创建用户。',
  },
  {
    key: 'allowLinuxDoRegistration',
    label: 'LinuxDo 注册',
    description: '控制新的 LinuxDo 账号是否允许首次创建用户。',
  },
] as const

type RegistrationSwitchKey = (typeof registrationSwitches)[number]['key']

export function useUsers() {
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
  const summaryCards = computed(() => {
    const activeUsers = users.value.filter(user => user.status === 'ACTIVE').length
    const disabledUsers = users.value.length - activeUsers
    const systemAdmins = users.value.filter(user => user.isSystemAdmin).length

    return [
      {
        label: '用户总数',
        value: users.value.length,
        detail: `正常 ${activeUsers}，禁用 ${disabledUsers}`,
        iconCategory: SvgIconCategory.UI,
        icon: 'user-group',
      },
      {
        label: '管理员',
        value: systemAdmins,
        detail: '具备系统后台访问权限',
        iconCategory: SvgIconCategory.UI,
        icon: 'user-admin',
      },
      {
        label: '文档交互',
        value: users.value.reduce((sum, user) => sum + user.sharedDocumentCount, 0),
        detail: '全平台共享文档总数',
        iconCategory: SvgIconCategory.UI,
        icon: 'share',
      },
    ]
  })
  const systemAdminStatusText = computed(() => governance.systemAdminMustChangePassword ? '首次密码待修改' : '已完成首次改密')

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

  function shouldShowEmailServiceHint(key: RegistrationSwitchKey) {
    return key === 'allowPasswordRegistration' && !governance.emailServiceEnabled
  }

  function isGovernanceSwitchDisabled(key: RegistrationSwitchKey) {
    if (key === 'allowPasswordRegistration' && !governance.emailServiceEnabled) {
      return true
    }

    return savingGovernanceFields[key]
  }

  function handleGovernanceSwitchChange(
    key: RegistrationSwitchKey,
    value: string | number | boolean,
  ) {
    if (typeof value !== 'boolean') {
      return
    }

    void updateGovernanceOption(key, value)
  }

  function formatDate(value: string | null) {
    if (!value) {
      return '暂无'
    }

    return formatDateTime(value)
  }

  onMounted(loadData)

  return {
    errorMessage,
    formatDate,
    governance,
    handleGovernanceSwitchChange,
    isLoading,
    isGovernanceSwitchDisabled,
    loadData,
    registrationSwitches,
    savingGovernanceFields,
    shouldShowEmailServiceHint,
    summaryCards,
    systemAdminStatusText,
    toggleUserStatus,
    updateGovernanceOption,
    updatingUserId,
    users,
  }

  function applyGovernance(nextGovernance: SystemAuthGovernanceDto) {
    Object.assign(governance, nextGovernance)
  }
}
