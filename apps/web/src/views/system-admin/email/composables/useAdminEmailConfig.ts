import type { FormInstance, FormItemRule, FormRules } from 'element-plus'
import type { SystemEmailConfigDto, SystemEmailProvider } from '@/apis/system-admin'
import {
  SYSTEM_EMAIL_PROVIDER,
  SYSTEM_EMAIL_PROVIDER_DEFAULTS,
  SYSTEM_EMAIL_PROVIDER_LABELS,
} from '@haohaoxue/samepage-contracts'
import {
  formatSystemEmailProvider,
} from '@haohaoxue/samepage-shared'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, shallowRef } from 'vue'
import {
  getSystemEmailConfig,
  testSystemEmailConfig,
  updateSystemEmailConfig,
} from '@/apis/system-admin'
import { getRequestErrorDisplayMessage } from '@/utils/request-error'
import { createEmailRules } from '@/views/auth/utils/rules'

const providerMeta = {
  [SYSTEM_EMAIL_PROVIDER.TENCENT_EXMAIL]: {
    title: SYSTEM_EMAIL_PROVIDER_LABELS[SYSTEM_EMAIL_PROVIDER.TENCENT_EXMAIL],
    description: '适合当前首版接入，默认提供推荐 SMTP 地址与端口。',
    defaults: SYSTEM_EMAIL_PROVIDER_DEFAULTS[SYSTEM_EMAIL_PROVIDER.TENCENT_EXMAIL],
    disabled: false,
  },
  [SYSTEM_EMAIL_PROVIDER.GOOGLE_WORKSPACE]: {
    title: SYSTEM_EMAIL_PROVIDER_LABELS[SYSTEM_EMAIL_PROVIDER.GOOGLE_WORKSPACE],
    description: '预留后续扩展，首版暂不开放配置。',
    defaults: SYSTEM_EMAIL_PROVIDER_DEFAULTS[SYSTEM_EMAIL_PROVIDER.GOOGLE_WORKSPACE],
    disabled: true,
  },
} as const satisfies Record<SystemEmailProvider, {
  title: string
  description: string
  defaults: {
    smtpHost: string
    smtpPort: number
    smtpSecure: boolean
  }
  disabled: boolean
}>

export function useAdminEmailConfig() {
  type RuleValidator = NonNullable<FormItemRule['validator']>

  const currentConfig = shallowRef<SystemEmailConfigDto | null>(null)
  const errorMessage = shallowRef('')
  const isLoading = shallowRef(false)
  const isSaving = shallowRef(false)
  const isTesting = shallowRef(false)
  const form = reactive({
    provider: SYSTEM_EMAIL_PROVIDER.TENCENT_EXMAIL as SystemEmailProvider,
    enabled: false,
    smtpHost: '',
    smtpPort: 465,
    smtpSecure: true,
    smtpUsername: '',
    smtpPassword: '',
    clearPassword: false,
    fromName: 'SamePage',
    fromEmail: '',
  })

  const providerCards = computed(() => Object.entries(providerMeta).map(([provider, meta]) => ({
    provider: provider as SystemEmailProvider,
    ...meta,
  })))

  const configStatusLabel = computed(() => {
    if (!currentConfig.value) {
      return '未配置'
    }

    return currentConfig.value.enabled ? '已启用' : '未启用'
  })
  const currentProviderTitle = computed(() => formatSystemEmailProvider(form.provider))

  const validatePassword: RuleValidator = (_rule, value, callback) => {
    const normalizedValue = typeof value === 'string' ? value.trim() : ''
    const hasExistingPassword = currentConfig.value?.hasPassword ?? false
    const shouldRequirePassword = form.enabled && (!hasExistingPassword || form.clearPassword)

    if (!normalizedValue && !shouldRequirePassword) {
      callback()
      return
    }

    if (!normalizedValue) {
      callback(new Error('启用发件服务前必须填写发件密码'))
      return
    }

    callback()
  }

  const validateHost: RuleValidator = (_rule, value, callback) => {
    const normalizedValue = typeof value === 'string' ? value.trim() : ''

    if (!normalizedValue) {
      callback(new Error('请输入 SMTP 主机地址'))
      return
    }

    callback()
  }

  const validateUsername: RuleValidator = (_rule, value, callback) => {
    const normalizedValue = typeof value === 'string' ? value.trim() : ''

    if (!normalizedValue) {
      callback(new Error('请输入发件账号'))
      return
    }

    callback()
  }

  const validateFromName: RuleValidator = (_rule, value, callback) => {
    const normalizedValue = typeof value === 'string' ? value.trim() : ''

    if (!normalizedValue) {
      callback(new Error('请输入发件人名称'))
      return
    }

    callback()
  }

  const validatePort: RuleValidator = (_rule, value, callback) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      callback(new Error('请输入合法端口'))
      return
    }

    callback()
  }

  const formRules: FormRules<typeof form> = {
    smtpHost: [{ validator: validateHost }],
    smtpPort: [{ validator: validatePort }],
    smtpUsername: [{ validator: validateUsername }],
    smtpPassword: [{ validator: validatePassword }],
    fromName: [{ validator: validateFromName }],
    fromEmail: createEmailRules('发件邮箱'),
  }

  async function loadConfig() {
    isLoading.value = true
    errorMessage.value = ''

    try {
      const config = await getSystemEmailConfig()
      currentConfig.value = config
      form.provider = config.provider
      form.enabled = config.enabled
      form.smtpHost = config.smtpHost
      form.smtpPort = config.smtpPort
      form.smtpSecure = config.smtpSecure
      form.smtpUsername = config.smtpUsername
      form.smtpPassword = ''
      form.clearPassword = false
      form.fromName = config.fromName
      form.fromEmail = config.fromEmail
    }
    catch (error) {
      errorMessage.value = getRequestErrorDisplayMessage(error, '加载发件配置失败')
    }
    finally {
      isLoading.value = false
    }
  }

  async function saveConfig(formRef: FormInstance | null | undefined) {
    normalizeForm()
    const isValid = formRef ? await formRef.validate().catch(() => false) : false

    if (!isValid) {
      return
    }

    isSaving.value = true

    try {
      currentConfig.value = await updateSystemEmailConfig({
        provider: form.provider,
        enabled: form.enabled,
        smtpHost: form.smtpHost,
        smtpPort: form.smtpPort,
        smtpSecure: form.smtpSecure,
        smtpUsername: form.smtpUsername,
        smtpPassword: form.smtpPassword || undefined,
        clearPassword: form.clearPassword || undefined,
        fromName: form.fromName,
        fromEmail: form.fromEmail,
      })
      form.smtpPassword = ''
      form.clearPassword = false
      ElMessage.success('发件配置已保存')
    }
    catch (error) {
      ElMessage.error(getRequestErrorDisplayMessage(error, '保存发件配置失败'))
    }
    finally {
      isSaving.value = false
    }
  }

  async function testConfig() {
    isTesting.value = true

    try {
      await testSystemEmailConfig()
      ElMessage.success('测试邮件已发送到当前管理员邮箱')
    }
    catch (error) {
      ElMessage.error(getRequestErrorDisplayMessage(error, '发送测试邮件失败'))
    }
    finally {
      isTesting.value = false
    }
  }

  function selectProvider(provider: SystemEmailProvider) {
    if (providerMeta[provider].disabled) {
      return
    }

    form.provider = provider
    form.smtpHost = providerMeta[provider].defaults.smtpHost
    form.smtpPort = providerMeta[provider].defaults.smtpPort
    form.smtpSecure = providerMeta[provider].defaults.smtpSecure
  }

  onMounted(loadConfig)

  return {
    configStatusLabel,
    currentConfig,
    currentProviderTitle,
    errorMessage,
    form,
    formRules,
    isLoading,
    isSaving,
    isTesting,
    providerCards,
    saveConfig,
    selectProvider,
    testConfig,
  }

  function normalizeForm() {
    form.smtpHost = form.smtpHost.trim()
    form.smtpUsername = form.smtpUsername.trim()
    form.smtpPassword = form.smtpPassword.trim()
    form.fromName = form.fromName.trim()
    form.fromEmail = form.fromEmail.trim()
  }
}
