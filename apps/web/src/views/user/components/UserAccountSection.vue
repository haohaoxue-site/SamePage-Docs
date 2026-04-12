<script setup lang="ts">
import type { AuthProviderName } from '@haohaoxue/samepage-domain'
import type { FormInstance } from 'element-plus'
import type { UserAccountSectionEmits, UserAccountSectionProps } from '../typing'
import { AUTH_PROVIDER } from '@haohaoxue/samepage-contracts'
import { computed, reactive, useTemplateRef } from 'vue'
import { AUTH_PROVIDER_UI_META } from '@/views/auth/utils/provider-ui'
import {
  createConfirmPasswordRules,
  createEmailRules,
  createPasswordRules,
} from '@/views/auth/utils/rules'

const props = defineProps<UserAccountSectionProps>()

const emit = defineEmits<UserAccountSectionEmits>()

const EMAIL_CODE_RE = /^\d{6}$/

const emailModel = defineModel<string>('email', { required: true })
const codeModel = defineModel<string>('code', { required: true })
const newPasswordModel = defineModel<string>('newPassword', { required: true })
const confirmPasswordModel = defineModel<string>('confirmPassword', { required: true })
const emailFormRef = useTemplateRef<FormInstance>('emailFormRef')
const form = reactive({
  email: emailModel,
  code: codeModel,
  newPassword: newPasswordModel,
  confirmPassword: confirmPasswordModel,
})

const requiresPasswordSetup = computed(() => !props.account.hasPasswordAuth)
const hasEmailAccountInfo = computed(() => Boolean(props.account.email) || props.account.hasPasswordAuth)
const showEmailStatus = computed(() => props.emailBindingEnabled || hasEmailAccountInfo.value)
const sectionDescription = computed(() => {
  if (props.emailBindingEnabled) {
    return '管理邮箱、GitHub 与 LinuxDo 登录方式。解绑第三方账号前，系统会校验是否仍保留可用登录方式。'
  }

  if (hasEmailAccountInfo.value) {
    return '查看邮箱与密码登录状态，并管理 GitHub 与 LinuxDo 登录方式。解绑第三方账号前，系统会校验是否仍保留可用登录方式。'
  }

  return '管理 GitHub 与 LinuxDo 登录方式。解绑第三方账号前，系统会校验是否仍保留可用登录方式。'
})

const emailFormRules = computed(() => ({
  email: createEmailRules('邮箱'),
  code: [
    {
      required: true,
      message: '请输入 6 位验证码',
    },
    {
      pattern: EMAIL_CODE_RE,
      message: '验证码需为 6 位数字',
    },
  ],
  newPassword: requiresPasswordSetup.value ? createPasswordRules('登录密码') : [],
  confirmPassword: requiresPasswordSetup.value
    ? createConfirmPasswordRules(() => form.newPassword, '确认登录密码')
    : [],
}))

const oauthRows = computed(() => [
  {
    provider: AUTH_PROVIDER.GITHUB,
    ...AUTH_PROVIDER_UI_META[AUTH_PROVIDER.GITHUB],
    connected: props.account.github.connected,
    username: props.account.github.username,
    canDisconnect: props.canDisconnectGithub,
  },
  {
    provider: AUTH_PROVIDER.LINUX_DO,
    ...AUTH_PROVIDER_UI_META[AUTH_PROVIDER.LINUX_DO],
    connected: props.account.linuxDo.connected,
    username: props.account.linuxDo.username,
    canDisconnect: props.canDisconnectLinuxDo,
  },
])

const emailButtonText = computed(() => {
  if (requiresPasswordSetup.value) {
    return props.account.email ? '更新邮箱并保留密码登录' : '绑定邮箱并启用密码登录'
  }

  return props.account.email ? '更新邮箱' : '绑定邮箱'
})

async function handleConfirmEmail() {
  const isValid = await emailFormRef.value?.validate().catch(() => false)

  if (!isValid) {
    return
  }

  emit('confirmEmail')
}

function handleStartOauthBinding(provider: AuthProviderName) {
  emit('startOauthBinding', provider)
}

function handleDisconnect(provider: AuthProviderName) {
  emit('disconnectOauthBinding', provider)
}
</script>

<template>
  <ElCard shadow="never" class="user-account-section">
    <div class="user-account-section__header">
      <div>
        <h2 class="user-account-section__title">
          账户绑定
        </h2>
        <p class="user-account-section__description">
          {{ sectionDescription }}
        </p>
      </div>
    </div>

    <div v-if="showEmailStatus" class="user-account-section__status-grid">
      <div class="user-account-section__status-card">
        <span class="user-account-section__status-label">当前邮箱</span>
        <strong class="user-account-section__status-value">{{ props.account.email || '未绑定' }}</strong>
        <span class="user-account-section__status-hint">
          {{ props.account.emailVerified ? '邮箱已验证，可用于密码登录。' : '绑定邮箱后将通过验证码完成验证。' }}
        </span>
      </div>
      <div class="user-account-section__status-card">
        <span class="user-account-section__status-label">密码登录</span>
        <strong class="user-account-section__status-value">{{ props.account.hasPasswordAuth ? '已启用' : '未启用' }}</strong>
        <span class="user-account-section__status-hint">
          {{ props.account.hasPasswordAuth ? '邮箱登录方式可继续使用。' : '首次绑定邮箱时需要一起设置登录密码。' }}
        </span>
      </div>
    </div>

    <ElForm
      v-if="props.emailBindingEnabled"
      ref="emailFormRef"
      :model="form"
      :rules="emailFormRules"
      label-position="top"
      class="user-account-section__form"
      @submit.prevent="handleConfirmEmail"
    >
      <div class="user-account-section__email-grid">
        <ElFormItem label="邮箱" prop="email">
          <ElInput v-model="form.email" autocomplete="email" placeholder="请输入需要绑定的邮箱地址" />
        </ElFormItem>
        <ElFormItem label="验证码" prop="code">
          <div class="user-account-section__code-field">
            <ElInput v-model="form.code" maxlength="6" placeholder="请输入 6 位验证码" />
            <ElButton :loading="props.isSendingCode" @click="emit('sendCode')">
              {{ props.isSendingCode ? '发送中...' : '发送验证码' }}
            </ElButton>
          </div>
        </ElFormItem>
      </div>

      <template v-if="requiresPasswordSetup">
        <div class="user-account-section__password-grid">
          <ElFormItem label="登录密码" prop="newPassword">
            <ElInput v-model="form.newPassword" type="password" show-password autocomplete="new-password" />
          </ElFormItem>
          <ElFormItem label="确认登录密码" prop="confirmPassword">
            <ElInput v-model="form.confirmPassword" type="password" show-password autocomplete="new-password" />
          </ElFormItem>
        </div>
        <p class="user-account-section__hint">
          当前账号还没有邮箱密码登录方式，首次绑定邮箱时需要一并设置登录密码。
        </p>
      </template>

      <ElButton type="primary" :loading="props.isBindingEmail" native-type="submit">
        {{ props.isBindingEmail ? '提交中...' : emailButtonText }}
      </ElButton>
    </ElForm>

    <div class="user-account-section__oauth-list">
      <div
        v-for="row in oauthRows"
        :key="row.provider"
        class="user-account-section__oauth-item"
      >
        <div class="user-account-section__oauth-main">
          <span class="user-account-section__oauth-icon-wrap">
            <SvgIcon
              category="ui"
              :icon="row.icon"
              size="1.125rem"
              class="user-account-section__oauth-icon"
            />
          </span>

          <div class="user-account-section__oauth-content">
            <div class="user-account-section__oauth-title">
              {{ row.title }}
            </div>
            <div class="user-account-section__oauth-meta">
              {{ row.connected ? `已绑定 ${row.username || '已授权账号'}` : '未绑定' }}
            </div>
          </div>
        </div>

        <div class="user-account-section__oauth-actions">
          <ElButton
            v-if="!row.connected"
            :loading="props.bindingProvider === row.provider"
            @click="handleStartOauthBinding(row.provider)"
          >
            立即绑定
          </ElButton>
          <ElButton
            v-else
            type="danger"
            plain
            :disabled="!row.canDisconnect"
            :loading="props.disconnectingProvider === row.provider"
            @click="handleDisconnect(row.provider)"
          >
            解绑
          </ElButton>
        </div>
      </div>
    </div>
  </ElCard>
</template>

<style scoped lang="scss">
.user-account-section {
  border-color: color-mix(in srgb, var(--brand-border-base) 85%, transparent);

  &__header {
    margin-bottom: 1.25rem;
  }

  &__title {
    margin: 0;
    color: var(--brand-text-primary);
    font-size: 1.125rem;
    font-weight: 700;
  }

  &__description {
    margin: 0.375rem 0 0;
    color: var(--brand-text-secondary);
    font-size: 0.875rem;
    line-height: 1.6;
  }

  &__status-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
    margin-bottom: 1.25rem;

    @media (min-width: 768px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  &__status-card {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding: 1rem;
    border: 1px solid color-mix(in srgb, var(--brand-border-base) 78%, transparent);
    border-radius: 1rem;
    background: color-mix(in srgb, var(--brand-fill-lighter) 72%, transparent);
  }

  &__status-label {
    color: var(--brand-text-secondary);
    font-size: 0.75rem;
  }

  &__status-value {
    color: var(--brand-text-primary);
    font-size: 1rem;
  }

  &__status-hint,
  &__hint {
    color: var(--brand-text-secondary);
    font-size: 0.75rem;
    line-height: 1.6;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  &__email-grid,
  &__password-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;

    @media (min-width: 768px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  &__code-field {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
  }

  &__oauth-list {
    margin-top: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  &__oauth-item {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid color-mix(in srgb, var(--brand-border-base) 78%, transparent);
    border-radius: 1rem;
  }

  &__oauth-main {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }

  &__oauth-icon-wrap {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border: 1px solid color-mix(in srgb, var(--brand-border-base) 72%, transparent);
    border-radius: 0.875rem;
    background: color-mix(in srgb, var(--brand-primary) 5%, var(--brand-bg-surface));
  }

  &__oauth-icon {
    color: var(--brand-text-primary);
  }

  &__oauth-content {
    min-width: 0;
  }

  &__oauth-title {
    color: var(--brand-text-primary);
    font-weight: 600;
  }

  &__oauth-meta {
    margin-top: 0.25rem;
    color: var(--brand-text-secondary);
    font-size: 0.8125rem;
  }

  &__oauth-actions {
    display: flex;
    gap: 0.75rem;
  }
}
</style>
