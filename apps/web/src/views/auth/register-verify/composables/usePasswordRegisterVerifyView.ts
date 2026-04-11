import type { FormRules } from 'element-plus'
import { computed, onMounted, reactive, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { confirmEmailVerification } from '@/apis/auth'
import { useFormSubmit } from '@/composables/useFormSubmit'
import { useAuthStore } from '@/stores/auth'
import { getRequestErrorDisplayMessage } from '@/utils/request-error'
import { completeAuthNavigation } from '../../utils/navigation'
import {
  createConfirmPasswordRules,
  createDisplayNameRules,
  createPasswordRules,
  isValidDisplayName,
  isValidPassword,
} from '../../utils/rules'

export function usePasswordRegisterVerifyView() {
  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()
  const statusLabel = shallowRef('正在校验验证链接...')
  const errorMessage = shallowRef('')
  const isChecking = shallowRef(false)
  const form = reactive({
    email: '',
    displayName: '',
    password: '',
    confirmPassword: '',
  })
  const formRules: FormRules<typeof form> = {
    displayName: createDisplayNameRules(),
    password: createPasswordRules(),
    confirmPassword: createConfirmPasswordRules(() => form.password),
  }

  const token = computed(() => typeof route.query.token === 'string' ? route.query.token.trim() : '')
  const isReady = computed(() => Boolean(form.email) && !errorMessage.value)

  async function validateToken() {
    if (!token.value) {
      statusLabel.value = '注册链接无效'
      errorMessage.value = '缺少注册令牌，请重新申请邮箱验证。'
      return
    }

    isChecking.value = true
    errorMessage.value = ''

    try {
      const result = await confirmEmailVerification({ token: token.value })
      form.email = result.email
      statusLabel.value = '邮箱验证通过'
    }
    catch (error) {
      statusLabel.value = '注册链接无效'
      errorMessage.value = getRequestErrorDisplayMessage(error, '注册链接无效')
    }
    finally {
      isChecking.value = false
    }
  }

  const { isSubmitting, submit: submitRegistration } = useFormSubmit({
    validate: () =>
      isReady.value
      && isValidDisplayName(form.displayName.trim())
      && isValidPassword(form.password)
      && form.confirmPassword === form.password,
    action: async () => {
      form.displayName = form.displayName.trim()
      await authStore.passwordRegister(token.value, form.displayName, form.password)
    },
    fallbackError: '注册失败',
    onSuccess: () => completeAuthNavigation(router, authStore),
  })

  onMounted(() => {
    void validateToken()
  })

  return {
    errorMessage,
    form,
    formRules,
    isChecking,
    isReady,
    isSubmitting,
    statusLabel,
    submitRegistration,
  }
}
