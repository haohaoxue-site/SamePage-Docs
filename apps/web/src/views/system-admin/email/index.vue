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
} = useAdminEmailConfig()

const configStatusStateClass = computed(() => currentConfig.value?.enabled ? 'enabled' : 'disabled')

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
            <p class="admin-email-config__description">
              选择后会自动带入推荐的 SMTP 参数，仍然可以按企业实际配置调整。
            </p>

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
                  <span>{{ provider.disabled ? '后续支持' : '可用' }}</span>
                </div>
                <p>{{ provider.description }}</p>
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
                <p class="admin-email-config__description">
                  当前保存的是全站统一发件账号，注册和绑定邮箱时都会用这里发信。
                </p>
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
              <div class="admin-email-config__toggle-card">
                <div>
                  <span class="admin-email-config__toggle-title">启用发件服务</span>
                  <p class="admin-email-config__toggle-description">
                    关闭后，注册和绑定邮箱都不会发送验证码。
                  </p>
                </div>
                <ElSwitch v-model="form.enabled" />
              </div>

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
                    <span>{{ currentConfig?.hasPassword ? '留空则保留当前密码。' : '首次启用时必须填写密码。' }}</span>
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
          <div class="admin-email-config__status-header">
            <span class="admin-email-config__status-label">当前状态</span>
            <div class="admin-email-config__status-chip" :class="configStatusStateClass">
              {{ configStatusLabel }}
            </div>
          </div>

          <dl class="admin-email-config__summary">
            <div class="admin-email-config__summary-row">
              <dt>当前模板</dt>
              <dd>{{ currentProviderTitle }}</dd>
            </div>
            <div class="admin-email-config__summary-row">
              <dt>SMTP 主机</dt>
              <dd>{{ currentConfig?.smtpHost || '-' }}</dd>
            </div>
            <div class="admin-email-config__summary-row">
              <dt>发件账号</dt>
              <dd>{{ currentConfig?.smtpUsername || '-' }}</dd>
            </div>
            <div class="admin-email-config__summary-row">
              <dt>发件人</dt>
              <dd>{{ currentConfig?.fromName || '-' }}</dd>
            </div>
            <div class="admin-email-config__summary-row">
              <dt>发件邮箱</dt>
              <dd>{{ currentConfig?.fromEmail || '-' }}</dd>
            </div>
            <div class="admin-email-config__summary-row">
              <dt>密码状态</dt>
              <dd>{{ currentConfig?.hasPassword ? '已保存' : '未保存' }}</dd>
            </div>
            <div class="admin-email-config__summary-row">
              <dt>最近更新</dt>
              <dd>{{ currentConfig?.updatedAt ? formatDateTime(currentConfig.updatedAt) : '暂无' }}</dd>
            </div>
            <div class="admin-email-config__summary-row">
              <dt>更新人</dt>
              <dd>{{ currentConfig?.updatedByDisplayName || '暂无' }}</dd>
            </div>
          </dl>
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

  &__description {
    margin: 0.375rem 0 0;
    color: var(--brand-text-secondary);
    font-size: 0.875rem;
    line-height: 1.6;
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
    transition: border-color 0.2s ease, transform 0.2s ease;

    &.is-active {
      border-color: color-mix(in srgb, var(--brand-primary) 60%, transparent);
      transform: translateY(-1px);
      background: color-mix(in srgb, var(--brand-primary) 6%, var(--brand-bg-surface));
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

  &__toggle-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 1rem;
    border: 1px solid color-mix(in srgb, var(--brand-border-base) 78%, transparent);
    border-radius: 1rem;
    background: color-mix(in srgb, var(--brand-fill-lighter) 72%, transparent);
  }

  &__toggle-title {
    color: var(--brand-text-primary);
    font-weight: 600;
  }

  &__toggle-description {
    margin: 0.25rem 0 0;
    color: var(--brand-text-secondary);
    font-size: 0.75rem;
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

  &__status-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  &__status-label {
    color: var(--brand-text-secondary);
    font-size: 0.8125rem;
  }

  &__status-chip {
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;

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
    gap: 0.75rem;
  }

  &__summary-row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid color-mix(in srgb, var(--brand-border-base) 82%, transparent);

    dt {
      color: var(--brand-text-secondary);
      font-size: 0.8125rem;
    }

    dd {
      margin: 0;
      color: var(--brand-text-primary);
      font-size: 0.875rem;
      text-align: right;
      word-break: break-all;
    }
  }
}
</style>
