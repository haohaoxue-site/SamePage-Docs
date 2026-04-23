<script setup lang="ts">
import type { FormInstance } from 'element-plus'
import type { SystemEmailProvider } from '@/apis/system-admin'
import { useTemplateRef } from 'vue'
import { formatDateTime } from '@/utils/dayjs'
import { useEmail } from './composables/useEmail'

const emailConfigFormRef = useTemplateRef<FormInstance>('emailConfigFormRef')
const testEmailFormRef = useTemplateRef<FormInstance>('testEmailFormRef')
const {
  configStatusLabel,
  configStatusStateClass,
  closeTestDialog,
  currentConfig,
  currentProviderTitle,
  currentServiceStatus,
  errorMessage,
  form,
  formRules,
  handleKeepSavedPassword,
  handleSaveConfig,
  handleSendTestEmail,
  handleServiceStatusChange,
  handleStartPasswordEdit,
  hasSavedPassword,
  isEditingPassword,
  isLoading,
  isSaving,
  isTestDialogVisible,
  isTesting,
  isUpdatingServiceStatus,
  openTestDialog,
  providerCards,
  selectProvider,
  testEmailForm,
  testEmailFormRules,
} = useEmail({
  emailConfigFormRef,
  testEmailFormRef,
})

function handleProviderChange(value: string | number | boolean | undefined) {
  if (typeof value !== 'string') {
    return
  }

  if (!providerCards.value.some(provider => provider.provider === value)) {
    return
  }

  selectProvider(value as SystemEmailProvider)
}
</script>

<template>
  <div v-loading="isLoading" class="admin-email-config">
    <ElAlert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="rounded-xl" />

    <template v-else>
      <div class="admin-email-config__layout">
        <ElCard shadow="never" class="admin-email-config__main-card">
          <div class="admin-email-config__section">
            <h2 class="m-0 text-lg font-bold text-main">
              服务商模板
            </h2>

            <ElRadioGroup
              v-model="form.provider"
              class="admin-email-config__provider-group mt-4"
              @change="handleProviderChange"
            >
              <ElRadio
                v-for="provider in providerCards"
                :key="provider.provider"
                :label="provider.provider"
                :value="provider.provider"
                :disabled="provider.disabled"
                border
                class="admin-email-config__provider-option"
              >
                <span class="admin-email-config__provider-title">
                  {{ provider.title }}
                </span>
                <span class="admin-email-config__provider-meta">
                  Host: {{ provider.defaults.smtpHost }} / Port: {{ provider.defaults.smtpPort }}
                </span>
                <span class="admin-email-config__provider-description">
                  {{ provider.description }}
                </span>
              </ElRadio>
            </ElRadioGroup>
          </div>

          <div class="admin-email-config__section">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <h2 class="m-0 text-lg font-bold text-main">
                SMTP 配置
              </h2>
              <ElButton @click="openTestDialog">
                发送测试邮件
              </ElButton>
            </div>

            <ElForm
              ref="emailConfigFormRef"
              :model="form"
              :rules="formRules"
              label-position="top"
              class="mt-4"
              @submit.prevent="handleSaveConfig"
            >
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ElFormItem label="SMTP Host" prop="smtpHost">
                  <ElInput v-model="form.smtpHost" placeholder="smtp.exmail.qq.com" />
                </ElFormItem>
                <ElFormItem label="端口" prop="smtpPort">
                  <ElInputNumber v-model="form.smtpPort" :min="1" :max="65535" controls-position="right" class="w-full" />
                </ElFormItem>
                <ElFormItem label="发件账号" prop="smtpUsername">
                  <ElInput v-model="form.smtpUsername" autocomplete="username" />
                </ElFormItem>
                <ElFormItem label="发件密码" prop="smtpPassword">
                  <ElButton v-if="hasSavedPassword && !isEditingPassword" plain type="primary" class="w-full" @click="handleStartPasswordEdit">
                    更换密码
                  </ElButton>
                  <div v-else class="flex w-full items-start gap-3">
                    <ElInput
                      v-model="form.smtpPassword"
                      class="min-w-0 flex-1"
                      type="password"
                      show-password
                      autocomplete="new-password"
                      :placeholder="hasSavedPassword ? '输入新的发件密码' : '请输入发件密码'"
                    />
                    <ElButton
                      v-if="hasSavedPassword && isEditingPassword"
                      link
                      class="shrink-0 self-center"
                      @click="handleKeepSavedPassword"
                    >
                      取消更换
                    </ElButton>
                  </div>
                </ElFormItem>
                <ElFormItem label="发件人名称" prop="fromName">
                  <ElInput v-model="form.fromName" />
                </ElFormItem>
                <ElFormItem label="发件邮箱" prop="fromEmail">
                  <ElInput v-model="form.fromEmail" autocomplete="email" />
                </ElFormItem>
              </div>

              <ElFormItem prop="smtpSecure">
                <ElCheckbox v-model="form.smtpSecure">
                  使用 SSL / TLS 加密连接
                </ElCheckbox>
              </ElFormItem>

              <ElButton type="primary" :loading="isSaving" native-type="submit">
                {{ isSaving ? '保存中...' : '保存发件配置' }}
              </ElButton>
            </ElForm>
          </div>
        </ElCard>

        <ElCard shadow="never" class="admin-email-config__status-card">
          <div class="flex flex-col gap-6">
            <section class="admin-email-config__service-panel">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <span class="inline-flex items-center text-xs font-semibold tracking-[0.04em] text-secondary">运行状态</span>
                  <h2 class="m-0 mt-2 text-xl font-bold leading-7 text-main">
                    控制站点邮件发送
                  </h2>
                </div>
                <div class="admin-email-config__status-chip" :class="configStatusStateClass">
                  {{ configStatusLabel }}
                </div>
              </div>

              <p class="mt-3.5 text-sm leading-7 text-secondary">
                这个开关会立即生效，不需要和 SMTP 配置一起保存。关闭后，注册和绑定邮箱会暂停发送验证码邮件。
              </p>

              <div class="admin-email-config__service-switch-card mt-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span class="block font-semibold text-main">启用发件服务</span>
                  <p class="mt-1.5 max-w-80 text-xs leading-6 text-secondary">
                    适合临时停用邮件发送或排查 SMTP 设置时使用。
                  </p>
                </div>
                <ElSwitch
                  :model-value="currentServiceStatus?.enabled ?? false"
                  :loading="isUpdatingServiceStatus"
                  :disabled="isUpdatingServiceStatus"
                  @change="handleServiceStatusChange"
                />
              </div>
            </section>

            <section class="pt-1">
              <div class="mb-4 flex flex-col gap-1">
                <span class="text-base font-bold text-main">当前配置</span>
                <span class="text-xs text-secondary">已保存的发件信息</span>
              </div>

              <ElDescriptions :column="1" direction="vertical" size="small" class="admin-email-config__summary">
                <ElDescriptionsItem label="当前模板">
                  <span class="admin-email-config__summary-value">
                    {{ currentProviderTitle }}
                  </span>
                </ElDescriptionsItem>
                <ElDescriptionsItem label="SMTP 主机">
                  <span class="admin-email-config__summary-value admin-email-config__summary-value--break-all">
                    {{ currentConfig?.smtpHost || '-' }}
                  </span>
                </ElDescriptionsItem>
                <ElDescriptionsItem label="发件账号">
                  <span class="admin-email-config__summary-value admin-email-config__summary-value--break-all">
                    {{ currentConfig?.smtpUsername || '-' }}
                  </span>
                </ElDescriptionsItem>
                <ElDescriptionsItem label="发件人">
                  <span class="admin-email-config__summary-value">
                    {{ currentConfig?.fromName || '-' }}
                  </span>
                </ElDescriptionsItem>
                <ElDescriptionsItem label="发件邮箱">
                  <span class="admin-email-config__summary-value admin-email-config__summary-value--break-all">
                    {{ currentConfig?.fromEmail || '-' }}
                  </span>
                </ElDescriptionsItem>
                <ElDescriptionsItem label="发件密码">
                  <span class="admin-email-config__summary-value">
                    {{ currentConfig?.hasPassword ? '已保存，页面不展示原值' : '暂未保存' }}
                  </span>
                </ElDescriptionsItem>
                <ElDescriptionsItem label="最近更新">
                  <span class="admin-email-config__summary-value">
                    {{ currentConfig?.updatedAt ? formatDateTime(currentConfig.updatedAt) : '暂无' }}
                  </span>
                </ElDescriptionsItem>
              </ElDescriptions>
            </section>
          </div>
        </ElCard>
      </div>

      <ElDialog
        v-model="isTestDialogVisible"
        title="发送测试邮件"
        width="32rem"
        destroy-on-close
        @close="closeTestDialog"
      >
        <ElForm
          ref="testEmailFormRef"
          :model="testEmailForm"
          :rules="testEmailFormRules"
          label-position="top"
          @submit.prevent="handleSendTestEmail"
        >
          <ElFormItem label="收件邮箱" prop="email">
            <ElInput
              v-model="testEmailForm.email"
              autocomplete="email"
              placeholder="请输入收件邮箱"
            />
          </ElFormItem>
        </ElForm>

        <template #footer>
          <div class="flex justify-end gap-3">
            <ElButton @click="closeTestDialog">
              取消
            </ElButton>
            <ElButton type="primary" :loading="isTesting" @click="handleSendTestEmail">
              {{ isTesting ? '发送中...' : '发送' }}
            </ElButton>
          </div>
        </template>
      </ElDialog>
    </template>
  </div>
</template>

<style scoped lang="scss">
.admin-email-config {
  padding-block: 1.5rem;

  &__layout {
    display: grid;
    gap: 1.5rem;

    @media (min-width: 1024px) {
      grid-template-columns: minmax(0, 1.5fr) minmax(22rem, 0.9fr);
      align-items: start;
    }
  }

  &__main-card,
  &__status-card {
    border-color: color-mix(in srgb, var(--brand-border-base) 82%, transparent);
    box-shadow: 0 24px 60px -48px color-mix(in srgb, var(--brand-text-primary) 22%, transparent);
  }

  &__status-card {
    order: -1;
    overflow: hidden;
    background:
      radial-gradient(circle at top right, color-mix(in srgb, var(--brand-primary) 5%, transparent), transparent 40%),
      linear-gradient(180deg, color-mix(in srgb, var(--brand-bg-sidebar) 18%, transparent), var(--brand-bg-surface));

    @media (min-width: 1024px) {
      order: 0;
      position: sticky;
      top: 1.5rem;
    }
  }

  &__section + &__section {
    margin-top: 1.75rem;
  }

  &__provider-group {
    display: grid;
    grid-template-columns: repeat(1, minmax(0, 1fr));
    gap: 0.75rem;

    @media (min-width: 768px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  &__provider-option {
    width: 100%;
    height: auto;
    margin: 0;
    text-align: left;
    border-radius: 1rem;
    transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;

    &:not(.is-disabled):hover {
      border-color: color-mix(in srgb, var(--brand-primary) 36%, var(--brand-border-base));
      transform: translateY(-1px);
      box-shadow: 0 16px 28px -24px color-mix(in srgb, var(--brand-primary) 55%, transparent);
    }

    &.is-checked {
      border-color: color-mix(in srgb, var(--brand-primary) 60%, transparent);
      transform: translateY(-1px);
      background: color-mix(in srgb, var(--brand-primary) 6%, var(--brand-bg-surface));
      box-shadow: 0 20px 36px -28px color-mix(in srgb, var(--brand-primary) 72%, transparent);
    }

    &.is-disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    :deep(.el-radio__input) {
      display: none;
    }

    :deep(.el-radio__label) {
      display: grid;
      gap: 0.45rem;
      width: 100%;
      padding: 1rem;
      color: inherit;
      line-height: 1.6;
      white-space: normal;
    }
  }

  &__provider-title {
    color: var(--brand-text-primary);
    font-size: 0.95rem;
    font-weight: 700;
    line-height: 1.4;
  }

  &__provider-meta,
  &__provider-description {
    color: var(--brand-text-secondary);
    font-size: 0.875rem;
    line-height: 1.6;
  }

  &__service-panel {
    padding: 1.25rem;
    border: 1px solid color-mix(in srgb, var(--brand-primary) 12%, var(--brand-border-base));
    border-radius: 1.25rem;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--brand-primary) 7%, var(--brand-bg-surface)), var(--brand-bg-surface));
    box-shadow: 0 24px 48px -40px color-mix(in srgb, var(--brand-primary) 60%, transparent);
  }

  &__service-switch-card {
    padding: 1rem 1rem 1rem 1.125rem;
    border: 1px solid color-mix(in srgb, var(--brand-border-base) 84%, transparent);
    border-radius: 1rem;
    background: color-mix(in srgb, var(--brand-bg-surface) 88%, white);
  }

  &__status-chip {
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;

    &.enabled {
      color: var(--brand-success);
      background: color-mix(in srgb, var(--brand-success) 12%, transparent);
    }

    &.disabled {
      color: var(--brand-error);
      background: color-mix(in srgb, var(--brand-error) 12%, transparent);
    }
  }

  &__summary {
    :deep(.el-descriptions__body) {
      background: transparent;
    }

    :deep(.el-descriptions__table) {
      width: 100%;
    }

    :deep(.el-descriptions__cell) {
      padding-bottom: 1rem;
    }

    :deep(.el-descriptions__cell:last-child) {
      padding-bottom: 0;
    }

    :deep(.el-descriptions__label) {
      margin-bottom: 0.375rem;
      color: var(--brand-text-secondary);
      font-size: 13px;
    }
  }

  &__summary-value {
    display: block;
    color: var(--brand-text-primary);
    font-size: 0.875rem;
    line-height: 1.6;
  }

  &__summary-value--break-all {
    word-break: break-all;
  }
}
</style>
