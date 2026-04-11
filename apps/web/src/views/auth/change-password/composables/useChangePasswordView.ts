import type { FormRules } from 'element-plus'
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useFormSubmit } from '@/composables/useFormSubmit'
import { useAuthStore } from '@/stores/auth'
import { completeAuthNavigation } from '../../utils/navigation'
import {
  createConfirmPasswordRules,
  createDifferentPasswordRule,
  createPasswordRules,
  isValidPassword,
} from '../../utils/rules'

export function useChangePasswordView() {
  const router = useRouter()
  const authStore = useAuthStore()
  const form = reactive({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const formRules: FormRules<typeof form> = {
    currentPassword: createPasswordRules('当前密码'),
    newPassword: [
      ...createPasswordRules('新密码'),
      createDifferentPasswordRule(() => form.currentPassword),
    ],
    confirmPassword: createConfirmPasswordRules(() => form.newPassword, '确认新密码', '两次输入的新密码不一致'),
  }

  const { isSubmitting, submit: submitChangePassword } = useFormSubmit({
    validate: () =>
      isValidPassword(form.currentPassword)
      && isValidPassword(form.newPassword)
      && form.confirmPassword === form.newPassword
      && form.currentPassword !== form.newPassword,
    action: () => authStore.updatePassword(form.currentPassword, form.newPassword),
    fallbackError: '修改密码失败',
    onSuccess: () => completeAuthNavigation(router, authStore),
  })

  return {
    form,
    formRules,
    isSubmitting,
    submitChangePassword,
  }
}
