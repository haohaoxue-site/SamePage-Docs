<script setup lang="ts">
import type { FormInstance } from 'element-plus'
import { computed, useTemplateRef } from 'vue'
import { formatDateTime } from '@/utils/dayjs'
import { useAdminEmailConfig } from './composables/useAdminEmailConfig'

const emailConfigFormRef = useTemplateRef<FormInstance>('emailConfigFormRef')
const {
  configStatusLabel,
  currentConfig,
  currentProviderTitle,
  currentServiceStatus,
  errorMessage,
  form,
  formRules,
  isLoading,
  isSaving,
  isTesting,
  isUpdatingServiceStatus,
  providerCards,
  saveConfig,
  selectProvider,
  testConfig,
  updateServiceStatus,
} = useAdminEmailConfig()

const configStatusStateClass = computed(() => currentServiceStatus.value?.enabled ? 'enabled' : 'disabled')

function handleServiceStatusChange(value: string | number | boolean) {
  if (typeof value !== 'boolean') {
    return
  }

  updateServiceStatus(value)
}

async function handleSaveConfig() {
  await saveConfig(emailConfigFormRef.value)
}
</script>

<template>
  <div v-loading="isLoading" class="admin-email-config">
    <ElAlert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="rounded-xl" />

    <template v-else>
      <div class="admin-email-config__layout">
        <ElCard shadow="never" class="admin-email-config__main-card">
          <div class="admin-email-config__section">
            <h2 class="admin-email-config__title">
              服务商模板
            </h2>

            <div class="admin-email-config__provider-grid">
              <button
                v-for="provider in providerCards"
                :key="provider.provider"
                type="button"
                class="admin-email-config__provider-card"
                :class="{
                  'is-active': form.provider === provider.provider,
                  'is-disabled': provider.disabled,
                }"
                :disabled="provider.disabled"
                @click="selectProvider(provider.provider)"
              >
                <div class="admin-email-config__provider-card-header">
                  <strong>{{ provider.title }}</strong>
                </div>
                <small>Host: {{ provider.defaults.smtpHost }} / Port: {{ provider.defaults.smtpPort }}</small>
              </button>
            </div>
          </div>

          <div class="admin-email-config__section">
            <div class="admin-email-config__section-header">
              <div>
                <h2 class="admin-email-config__title">
                  SMTP 配置
                </h2>
              </div>
              <ElButton :loading="isTesting" @click="testConfig">
                {{ isTesting ? '发送中...' : '发送测试邮件' }}
              </ElButton>
            </div>

            <ElForm
              ref="emailConfigFormRef"
              :model="form"
              :rules="formRules"
              label-position="top"
              class="admin-email-config__form"
              @submit.prevent="handleSaveConfig"
            >
              <div class="admin-email-config__grid">
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
                  <ElInput v-model="form.smtpPassword" type="password" show-password autocomplete="new-password" />
                  <div class="admin-email-config__password-hint">
                    <span>{{ currentConfig?.hasPassword ? '留空则保留当前密码。' : '启用发件服务前需要先保存发件密码。' }}</span>
                    <ElCheckbox v-model="form.clearPassword">
                      清空现有密码
                    </ElCheckbox>
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
          <div class="admin-email-config__status-card-inner">
            <section class="admin-email-config__service-panel">
              <div class="admin-email-config__service-header">
                <div class="admin-email-config__service-copy">
                  <span class="admin-email-config__eyebrow">运行状态</span>
                  <h2 class="admin-email-config__service-title">
                    控制站点邮件发送
                  </h2>
                </div>
                <div class="admin-email-config__status-chip" :class="configStatusStateClass">
                  {{ configStatusLabel }}
                </div>
              </div>

              <p class="admin-email-config__service-description">
                这个开关会立即生效，不需要和 SMTP 配置一起保存。关闭后，注册和绑定邮箱会暂停发送验证码邮件。
              </p>

              <div class="admin-email-config__service-switch-card">
                <div>
                  <span class="admin-email-config__service-switch-title">启用发件服务</span>
                  <p class="admin-email-config__service-switch-hint">
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

            <section class="admin-email-config__summary-section">
              <div class="admin-email-config__summary-header">
                <span class="admin-email-config__summary-title">当前配置</span>
                <span class="admin-email-config__summary-subtitle">已保存的发件信息</span>
              </div>

              <dl class="admin-email-config__summary">
                <div class="admin-email-config__summary-row">
                  <dt class="admin-email-config__summary-term">
                    当前模板
                  </dt>
                  <dd class="admin-email-config__summary-value">
                    {{ currentProviderTitle }}
                  </dd>
                </div>
                <div class="admin-email-config__summary-row">
                  <dt class="admin-email-config__summary-term">
                    SMTP 主机
                  </dt>
                  <dd class="admin-email-config__summary-value">
                    {{ currentConfig?.smtpHost || '-' }}
                  </dd>
                </div>
                <div class="admin-email-config__summary-row">
                  <dt class="admin-email-config__summary-term">
                    发件账号
                  </dt>
                  <dd class="admin-email-config__summary-value">
                    {{ currentConfig?.smtpUsername || '-' }}
                  </dd>
                </div>
                <div class="admin-email-config__summary-row">
                  <dt class="admin-email-config__summary-term">
                    发件人
                  </dt>
                  <dd class="admin-email-config__summary-value">
                    {{ currentConfig?.fromName || '-' }}
                  </dd>
                </div>
                <div class="admin-email-config__summary-row">
                  <dt class="admin-email-config__summary-term">
                    发件邮箱
                  </dt>
                  <dd class="admin-email-config__summary-value">
                    {{ currentConfig?.fromEmail || '-' }}
                  </dd>
                </div>
                <div class="admin-email-config__summary-row">
                  <dt class="admin-email-config__summary-term">
                    密码状态
                  </dt>
                  <dd class="admin-email-config__summary-value">
                    {{ currentConfig?.hasPassword ? '已保存' : '未保存' }}
                  </dd>
                </div>
              </dl>

              <div class="admin-email-config__updated-at">
                <span class="admin-email-config__updated-at-label">最近更新</span>
                <span class="admin-email-config__updated-at-value">
                  {{ currentConfig?.updatedAt ? formatDateTime(currentConfig.updatedAt) : '暂无' }}
                </span>
              </div>
            </section>
          </div>
        </ElCard>
      </div>
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

  &__section-header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  &__title {
    margin: 0;
    color: var(--brand-text-primary);
    font-size: 1.125rem;
    font-weight: 700;
  }

  &__provider-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
    margin-top: 1rem;

    @media (min-width: 768px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  &__provider-card {
    text-align: left;
    padding: 1rem;
    border: 1px solid color-mix(in srgb, var(--brand-border-base) 78%, transparent);
    border-radius: 1rem;
    background: var(--brand-bg-surface);
    transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;

    &:not(.is-disabled):hover {
      border-color: color-mix(in srgb, var(--brand-primary) 36%, var(--brand-border-base));
      transform: translateY(-1px);
      box-shadow: 0 16px 28px -24px color-mix(in srgb, var(--brand-primary) 55%, transparent);
    }

    &.is-active {
      border-color: color-mix(in srgb, var(--brand-primary) 60%, transparent);
      transform: translateY(-1px);
      background: color-mix(in srgb, var(--brand-primary) 6%, var(--brand-bg-surface));
      box-shadow: 0 20px 36px -28px color-mix(in srgb, var(--brand-primary) 72%, transparent);
    }

    &.is-disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    p,
    small {
      display: block;
      margin: 0.5rem 0 0;
      color: var(--brand-text-secondary);
      line-height: 1.6;
    }
  }

  &__provider-card-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    color: var(--brand-text-primary);
  }

  &__form {
    margin-top: 1rem;
  }

  &__status-card-inner {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  &__service-panel {
    padding: 1.25rem;
    border: 1px solid color-mix(in srgb, var(--brand-primary) 12%, var(--brand-border-base));
    border-radius: 1.25rem;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--brand-primary) 7%, var(--brand-bg-surface)), var(--brand-bg-surface));
    box-shadow: 0 24px 48px -40px color-mix(in srgb, var(--brand-primary) 60%, transparent);
  }

  &__service-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  &__service-copy {
    min-width: 0;
  }

  &__eyebrow {
    display: inline-flex;
    align-items: center;
    color: var(--brand-text-secondary);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
  }

  &__service-title {
    margin: 0.5rem 0 0;
    color: var(--brand-text-primary);
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1.4;
  }

  &__service-description {
    margin: 0.875rem 0 0;
    color: var(--brand-text-secondary);
    font-size: 0.875rem;
    line-height: 1.7;
  }

  &__service-switch-card {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 1.25rem;
    padding: 1rem 1rem 1rem 1.125rem;
    border: 1px solid color-mix(in srgb, var(--brand-border-base) 84%, transparent);
    border-radius: 1rem;
    background: color-mix(in srgb, var(--brand-bg-surface) 88%, white);
  }

  &__service-switch-title {
    display: block;
    color: var(--brand-text-primary);
    font-weight: 600;
  }

  &__service-switch-hint {
    margin: 0.375rem 0 0;
    color: var(--brand-text-secondary);
    font-size: 0.75rem;
    line-height: 1.6;
    max-width: 20rem;
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;

    @media (min-width: 768px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  &__password-hint {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-top: 0.5rem;
    color: var(--brand-text-secondary);
    font-size: 0.75rem;
  }

  &__summary-section {
    padding-top: 0.25rem;
  }

  &__summary-header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 1rem;
  }

  &__summary-title {
    color: var(--brand-text-primary);
    font-size: 0.9375rem;
    font-weight: 700;
  }

  &__summary-subtitle {
    color: var(--brand-text-secondary);
    font-size: 0.75rem;
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
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  &__summary-row {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding-bottom: 0.875rem;
    border-bottom: 1px solid color-mix(in srgb, var(--brand-border-base) 82%, transparent);

    @media (min-width: 768px) {
      flex-direction: row;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
    }

    &:last-child {
      padding-bottom: 0;
      border-bottom: none;
    }
  }

  &__summary-term {
    color: var(--brand-text-secondary);
    font-size: 0.8125rem;
  }

  &__summary-value {
    margin: 0;
    color: var(--brand-text-primary);
    font-size: 0.875rem;
    word-break: break-all;

    @media (min-width: 768px) {
      text-align: right;
    }
  }

  &__updated-at {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid color-mix(in srgb, var(--brand-border-base) 82%, transparent);
  }

  &__updated-at-label {
    color: var(--brand-text-secondary);
    font-size: 0.8125rem;
  }

  &__updated-at-value {
    color: var(--brand-text-primary);
    font-size: 0.875rem;
    font-weight: 600;
    text-align: right;
  }
}
</style>
