<script setup lang="ts">
import type { FormInstance } from 'element-plus'
import { useTemplateRef } from 'vue'
import { formatDateTime } from '@/utils/dayjs'
import { useAiConfig } from './composables/useAiConfig'

const systemAiConfigFormRef = useTemplateRef<FormInstance>('systemAiConfigFormRef')
const {
  configStatusLabel,
  configStatusStateClass,
  currentConfig,
  currentServiceStatus,
  errorMessage,
  form,
  formRules,
  handleKeepSavedApiKey,
  handleSaveConfig,
  handleServiceStatusChange,
  handleStartApiKeyEdit,
  hasSavedApiKey,
  isEditingApiKey,
  isLoading,
  isSaving,
  isUpdatingServiceStatus,
} = useAiConfig({
  systemAiConfigFormRef,
})
</script>

<template>
  <div v-loading="isLoading" class="system-ai-config">
    <ElAlert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="rounded-xl" />

    <div v-else class="system-ai-config__layout">
      <ElCard shadow="never" class="system-ai-config__main-card">
        <div class="system-ai-config__section">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 class="m-0 text-lg font-bold text-main">
                AI 服务配置
              </h2>
              <p class="mt-1.5 text-sm leading-6 text-secondary">
                设置工作区使用的 AI 地址和密钥。
              </p>
            </div>
          </div>

          <ElForm
            ref="systemAiConfigFormRef"
            :model="form"
            :rules="formRules"
            label-position="top"
            class="mt-4"
            @submit.prevent="handleSaveConfig"
          >
            <ElFormItem label="API 地址" prop="baseUrl">
              <ElInput v-model="form.baseUrl" placeholder="https://api.openai.com/v1" />
            </ElFormItem>

            <ElFormItem label="API Key" prop="apiKey">
              <ElButton v-if="hasSavedApiKey && !isEditingApiKey" plain type="primary" class="w-full" @click="handleStartApiKeyEdit">
                更换 API Key
              </ElButton>
              <div v-else class="flex w-full items-start gap-3">
                <ElInput
                  v-model="form.apiKey"
                  class="min-w-0 flex-1"
                  type="password"
                  show-password
                  autocomplete="new-password"
                  :placeholder="hasSavedApiKey ? '输入新的 API Key' : '请输入 API Key'"
                />
                <ElButton
                  v-if="hasSavedApiKey && isEditingApiKey"
                  link
                  class="shrink-0 self-center"
                  @click="handleKeepSavedApiKey"
                >
                  取消更换
                </ElButton>
              </div>
            </ElFormItem>

            <ElButton type="primary" :loading="isSaving" native-type="submit">
              {{ isSaving ? '保存中...' : '保存 AI 配置' }}
            </ElButton>
          </ElForm>
        </div>
      </ElCard>

      <ElCard shadow="never" class="system-ai-config__status-card">
        <div class="flex flex-col gap-6">
          <section class="system-ai-config__service-panel">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <span class="inline-flex items-center text-xs font-semibold tracking-[0.04em] text-secondary">运行状态</span>
                <h2 class="m-0 mt-2 text-xl font-bold leading-7 text-main">
                  控制工作区 AI 服务
                </h2>
              </div>
              <div class="system-ai-config__status-chip" :class="configStatusStateClass">
                {{ configStatusLabel }}
              </div>
            </div>

            <p class="mt-3.5 text-sm leading-7 text-secondary">
              这个开关会立即生效，不需要和 AI 配置一起保存。关闭后，工作区里的 AI 能力会暂时不可用。
            </p>

            <div class="system-ai-config__service-switch-card mt-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span class="block font-semibold text-main">启用 AI 服务</span>
                <p class="mt-1.5 max-w-80 text-xs leading-6 text-secondary">
                  适合在更换地址、Key 或排查可用性时临时关闭。
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
              <span class="text-xs text-secondary">已保存的 AI 连接信息</span>
            </div>

            <ElDescriptions :column="1" direction="vertical" size="small" class="system-ai-config__summary">
              <ElDescriptionsItem label="API 地址">
                <span class="system-ai-config__summary-value system-ai-config__summary-value--break-all">
                  {{ currentConfig?.baseUrl || '-' }}
                </span>
              </ElDescriptionsItem>
              <ElDescriptionsItem label="API Key">
                <span class="system-ai-config__summary-value">
                  {{ currentConfig?.hasApiKey ? '已保存，页面不展示原值' : '暂未保存' }}
                </span>
              </ElDescriptionsItem>
              <ElDescriptionsItem label="最近更新">
                <span class="system-ai-config__summary-value">
                  {{ currentConfig?.updatedAt ? formatDateTime(currentConfig.updatedAt) : '暂无' }}
                </span>
              </ElDescriptionsItem>
            </ElDescriptions>
          </section>
        </div>
      </ElCard>
    </div>
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

  &__service-panel {
    padding: 1.25rem;
    border: 1px solid color-mix(in srgb, var(--brand-primary) 12%, var(--brand-border-base));
    border-radius: 1.25rem;
    background: linear-gradient(180deg, color-mix(in srgb, var(--brand-primary) 7%, var(--brand-bg-surface)), var(--brand-bg-surface));
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
