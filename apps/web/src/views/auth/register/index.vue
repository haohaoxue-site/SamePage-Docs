<script setup lang="ts">
import type { FormInstance } from 'element-plus'
import { useTemplateRef } from 'vue'
import AuthEntryShell from '../components/AuthEntryShell.vue'
import { useRegister } from './composables/useRegister'

const registerRequestFormRef = useTemplateRef<FormInstance>('registerRequestFormRef')
const {
  form,
  formRules,
  handleSubmitEmailVerificationRequest,
  isLoadingCapabilities,
  isSubmitting,
  loadErrorMessage,
  passwordRegistrationEnabled,
} = useRegister({
  registerRequestFormRef,
})
</script>

<template>
  <AuthEntryShell
    :title="!isLoadingCapabilities && !passwordRegistrationEnabled ? '邮箱注册暂未开放' : '创建账号'"
    :description="!isLoadingCapabilities && !passwordRegistrationEnabled ? '当前仅支持已有账号登录。' : '输入邮箱，我们会发送验证码。'"
  >
    <ElAlert
      v-if="loadErrorMessage"
      :title="loadErrorMessage"
      type="error"
      show-icon
      :closable="false"
      class="password-register-view__alert"
    />

    <template v-else>
      <div v-if="!isLoadingCapabilities && !passwordRegistrationEnabled" class="password-register-view__closed-state">
        <div class="password-register-view__closed-icon">
          <SvgIcon category="ui" icon="lock" size="1.25rem" />
        </div>
        <div>
          <h2 class="password-register-view__closed-title">
            当前未开放邮箱注册
          </h2>
          <p class="password-register-view__closed-description">
            请返回登录页，使用已有账号或第三方账号继续。
          </p>
        </div>
        <RouterLink :to="{ name: 'login' }" class="password-register-view__secondary-link">
          返回登录
        </RouterLink>
      </div>

      <template v-else>
        <ElForm
          ref="registerRequestFormRef"
          v-loading="isLoadingCapabilities"
          :model="form"
          :rules="formRules"
          label-position="top"
          class="password-register-view__form"
          @submit.prevent="handleSubmitEmailVerificationRequest"
        >
          <ElFormItem label="注册邮箱" prop="email">
            <ElInput
              v-model="form.email"
              autocomplete="email"
              placeholder="输入邮箱地址"
              :disabled="isSubmitting"
            />
          </ElFormItem>

          <ElButton
            type="primary"
            native-type="submit"
            class="password-register-view__submit"
            :loading="isSubmitting"
          >
            发送验证码
          </ElButton>
        </ElForm>
      </template>
    </template>

    <template #footer>
      <template v-if="loadErrorMessage || isLoadingCapabilities || passwordRegistrationEnabled">
        <span class="password-register-view__footer-copy">已有账号？</span>
        <RouterLink :to="{ name: 'login' }" class="password-register-view__footer-link">
          返回登录
        </RouterLink>
      </template>
    </template>
  </AuthEntryShell>
</template>

<style scoped lang="scss">
.password-register-view {
  &__alert {
    margin-bottom: 1rem;
  }

  &__closed-state {
    display: grid;
    gap: 1rem;
    padding: 1.5rem;
    border: 1px solid color-mix(in srgb, var(--brand-border-base) 80%, transparent);
    border-radius: 1.25rem;
    background: color-mix(in srgb, var(--brand-fill-lighter) 60%, transparent);
  }

  &__closed-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 0.875rem;
    color: var(--brand-primary);
    background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
  }

  &__closed-title {
    margin: 0;
    color: var(--brand-text-primary);
    font-size: 1.125rem;
    font-weight: 700;
  }

  &__closed-description {
    margin: 0.5rem 0 0;
    color: var(--brand-text-secondary);
    font-size: 0.875rem;
    line-height: 1.7;
  }

  &__secondary-link {
    display: inline-flex;
    align-items: center;
    width: fit-content;
    color: var(--brand-primary);
    font-size: 0.875rem;
    font-weight: 600;
    text-decoration: none;
  }

  &__form {
    width: 100%;
  }

  &__submit {
    width: 100%;
    min-height: 2.875rem;
  }

  &__footer-copy {
    color: var(--brand-text-secondary);
  }

  &__footer-link {
    color: var(--brand-primary);
    font-weight: 600;
    text-decoration: none;
  }
}
</style>
