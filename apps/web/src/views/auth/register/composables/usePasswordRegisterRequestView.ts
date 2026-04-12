import type { FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { requestEmailVerification } from '@/apis/auth'
import { useFormSubmit } from '@/composables/useFormSubmit'
import { useAuthCapabilities } from '../../composables/useAuthCapabilities'
import { createEmailRules, isValidEmail } from '../../utils/rules'

export function usePasswordRegisterRequestView() {
  const router = useRouter()
  const form = reactive({ email: '' })
  const formRules: FormRules<typeof form> = {
    email: createEmailRules(),
  }
  const {
    isLoadingCapabilities,
    loadErrorMessage,
    loadCapabilities,
    passwordRegistrationEnabled,
  } = useAuthCapabilities()

  const { isSubmitting, submit: submitEmailVerificationRequest } = useFormSubmit({
    validate: () => passwordRegistrationEnabled.value && isValidEmail(form.email.trim()),
    action: async () => {
      form.email = form.email.trim()
      await requestEmailVerification({ email: form.email })
      ElMessage.success('验证码已发送，请查收邮箱')
      await router.push({
        name: 'register-verify',
        query: {
          email: form.email,
        },
      })
    },
    fallbackError: '发送验证码失败',
  })

  onMounted(() => {
    void loadCapabilities()
  })

  return {
    form,
    formRules,
    isLoadingCapabilities,
    isSubmitting,
    loadErrorMessage,
    passwordRegistrationEnabled,
    submitEmailVerificationRequest,
  }
}
