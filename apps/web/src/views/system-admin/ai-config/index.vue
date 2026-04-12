<script setup lang="ts">
import type { FormInstance } from 'element-plus'
import { computed, useTemplateRef } from 'vue'
import { formatDateTime } from '@/utils/dayjs'
import { useSystemAiConfig } from './composables/useSystemAiConfig'

const systemAiConfigFormRef = useTemplateRef<FormInstance>('systemAiConfigFormRef')
const {
  configStatusLabel,
  currentConfig,
  currentServiceStatus,
  errorMessage,
  form,
  formRules,
  isLoading,
  isSaving,
  isUpdatingServiceStatus,
  saveConfig,
  updateServiceStatus,
} = useSystemAiConfig()

const currentProviderTitle = 'OpenAI Compatible'
const configStatusStateClass = computed(() => currentServiceStatus.value?.enabled ? 'enabled' : 'disabled')

function handleServiceStatusChange(value: string | number | boolean) {
  if (typeof value !== 'boolean') {
    return
  }

  updateServiceStatus(value)
}

async function handleSaveConfig() {
  await saveConfig(systemAiConfigFormRef.value)
}
</script>

<template>
  <div v-loading="isLoading" class="system-ai-config">
    <ElAlert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="rounded-xl" />

    <template v-else>
      <div class="system-ai-config__layout">
        <ElCard shadow="never" class="system-ai-config__main-card">
          <div class="system-ai-config__section">
            <div class="system-ai-config__section-header">
              <div>
                <h2 class="system-ai-config__title">
                  AI 服务配置
                </h2>
                <p class="system-ai-config__description">
                  设置工作区默认使用的 AI 地址、模型和密钥。
                </p>
              </div>
            </div>

            <ElForm
              ref="systemAiConfigFormRef"
              :model="form"
              :rules="formRules"
              label-position="top"
              class="system-ai-config__form"
              @submit.prevent="handleSaveConfig"
            >
              <div class="system-ai-config__grid">
                <ElFormItem label="API 地址" prop="baseUrl">
                  <ElInput v-model="form.baseUrl" placeholder="https://api.openai.com/v1" />
                </ElFormItem>
                <ElFormItem label="默认模型" prop="defaultModel">
                  <ElInput v-model="form.defaultModel" placeholder="gpt-4.1-mini" />
                </ElFormItem>
              </div>

              <ElFormItem label="API Key" prop="apiKey">
                <ElInput v-model="form.apiKey" type="password" show-password autocomplete="new-password" />
                <div class="system-ai-config__secret-hint">
                  <span>{{ currentConfig?.hasApiKey ? '留空则保留当前 Key。' : '启用 AI 服务前需要先保存 API Key。' }}</span>
                  <ElCheckbox v-model="form.clearApiKey">
                    清空现有 Key
                  </ElCheckbox>
                </div>
              </ElFormItem>

              <ElButton type="primary" :loading="isSaving" native-type="submit">
                {{ isSaving ? '保存中...' : '保存 AI 配置' }}
              </ElButton>
            </ElForm>
          </div>
        </ElCard>

        <ElCard shadow="never" class="system-ai-config__status-card">
          <div class="system-ai-config__status-card-inner">
            <section class="system-ai-config__service-panel">
              <div class="system-ai-config__service-header">
                <div class="system-ai-config__service-copy">
                  <span class="system-ai-config__eyebrow">运行状态</span>
                  <h2 class="system-ai-config__service-title">
                    控制工作区 AI 服务
                  </h2>
                </div>
                <div class="system-ai-config__status-chip" :class="configStatusStateClass">
                  {{ configStatusLabel }}
                </div>
              </div>

              <p class="system-ai-config__service-description">
                这个开关会立即生效，不需要和 AI 配置一起保存。关闭后，工作区里的 AI 能力会暂时不可用。
              </p>

              <div class="system-ai-config__service-switch-card">
                <div>
                  <span class="system-ai-config__service-switch-title">启用 AI 服务</span>
                  <p class="system-ai-config__service-switch-hint">
                    适合在更换 Key、模型或排查可用性时临时关闭。
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

            <section class="system-ai-config__summary-section">
              <div class="system-ai-config__summary-header">
                <span class="system-ai-config__summary-title">当前配置</span>
                <span class="system-ai-config__summary-subtitle">已保存的 AI 连接信息</span>
              </div>

              <dl class="system-ai-config__summary">
                <div class="system-ai-config__summary-row">
                  <dt class="system-ai-config__summary-term">
                    接入方式
                  </dt>
                  <dd class="system-ai-config__summary-value">
                    {{ currentProviderTitle }}
                  </dd>
                </div>
                <div class="system-ai-config__summary-row">
                  <dt class="system-ai-config__summary-term">
                    API 地址
                  </dt>
                  <dd class="system-ai-config__summary-value">
                    {{ currentConfig?.baseUrl || '-' }}
                  </dd>
                </div>
                <div class="system-ai-config__summary-row">
                  <dt class="system-ai-config__summary-term">
                    默认模型
                  </dt>
                  <dd class="system-ai-config__summary-value">
                    {{ currentConfig?.defaultModel || '-' }}
                  </dd>
                </div>
                <div class="system-ai-config__summary-row">
                  <dt class="system-ai-config__summary-term">
                    Key 状态
                  </dt>
                  <dd class="system-ai-config__summary-value">
                    {{ currentConfig?.hasApiKey ? '已保存' : '未保存' }}
                  </dd>
                </div>
              </dl>

              <div class="system-ai-config__updated-at">
                <span class="system-ai-config__updated-at-label">最近更新</span>
                <span class="system-ai-config__updated-at-value">
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
.system-ai-config {
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

  &__form {
    margin-top: 1rem;
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;

    @media (min-width: 768px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  &__secret-hint {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-top: 0.5rem;
    color: var(--brand-text-secondary);
    font-size: 0.75rem;
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
    background: linear-gradient(180deg, color-mix(in srgb, var(--brand-primary) 7%, var(--brand-bg-surface)), var(--brand-bg-surface));
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
