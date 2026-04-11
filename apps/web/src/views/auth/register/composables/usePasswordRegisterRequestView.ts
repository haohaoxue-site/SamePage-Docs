import type { FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { onMounted, reactive, shallowRef } from 'vue'
import { requestEmailVerification } from '@/apis/auth'
import { useFormSubmit } from '@/composables/useFormSubmit'
import { useAuthRegistrationOptions } from '../../composables/useAuthRegistrationOptions'
import { createEmailRules, isValidEmail } from '../../utils/rules'

export function usePasswordRegisterRequestView() {
  const form = reactive({ email: '' })
  const formRules: FormRules<typeof form> = {
    email: createEmailRules(),
  }
  const submittedEmail = shallowRef('')
  const {
    allowPasswordRegistration,
    isLoadingOptions,
    loadErrorMessage,
    loadRegistrationOptions,
  } = useAuthRegistrationOptions()

  const { isSubmitting, submit: submitEmailVerificationRequest } = useFormSubmit({
    validate: () => allowPasswordRegistration.value && isValidEmail(form.email.trim()),
    action: async () => {
      form.email = form.email.trim()
      await requestEmailVerification({ email: form.email })
      submittedEmail.value = form.email
      form.email = ''
      ElMessage.success('验证链接已发送，请查收邮箱')
    },
    fallbackError: '发送验证链接失败',
  })

  onMounted(() => {
    void loadRegistrationOptions()
  })

  return {
    allowPasswordRegistration,
    form,
    formRules,
    isLoadingOptions,
    isSubmitting,
    loadErrorMessage,
    submittedEmail,
    submitEmailVerificationRequest,
  }
}
