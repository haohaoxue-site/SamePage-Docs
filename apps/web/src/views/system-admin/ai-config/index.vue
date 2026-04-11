<script setup lang="ts">
import type { FormInstance } from 'element-plus'
import { computed, onMounted, useTemplateRef } from 'vue'
import { formatDateTime } from '@/utils/dayjs'
import { useSystemAiConfig } from './composables/useSystemAiConfig'

const systemAiConfigFormRef = useTemplateRef<FormInstance>('systemAiConfigFormRef')
const {
  currentConfig,
  errorMessage,
  form,
  formRules,
  isLoading,
  isSaving,
  loadConfig,
  saveConfig,
} = useSystemAiConfig()

const configStatusLabel = computed(() => {
  if (!currentConfig.value) {
    return '未配置'
  }

  return currentConfig.value.enabled ? '已启用' : '未启用'
})

const configStatusStateClass = computed(() => currentConfig.value?.enabled ? 'enabled' : 'disabled')

async function handleSaveConfig() {
  await saveConfig(systemAiConfigFormRef.value)
}

onMounted(loadConfig)
</script>

<template>
  <div v-loading="isLoading" class="system-ai-config space-y-6 py-6 font-sans">
    <ElAlert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="rounded-xl" />

    <template v-if="!isLoading && !errorMessage">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <ElCard shadow="never" body-class="system-ai-config__card-body" class="system-ai-config__form-card">
          <div class="system-ai-config__panel-header">
            <SvgIcon category="ui" icon="settings" size="1.25rem" />
            <h3 class="text-xl font-bold text-main">
              系统 AI 参数配置
            </h3>
          </div>
          <p class="system-ai-config__panel-description">
            配置系统级 AI 默认参数。
          </p>

          <ElForm
            ref="systemAiConfigFormRef"
            :model="form"
            :rules="formRules"
            label-position="top"
            class="space-y-6"
            @submit.prevent="handleSaveConfig"
          >
            <div class="system-ai-config__toggle-card">
              <div class="flex flex-col">
                <span class="text-sm font-semibold text-main">启用系统级配置</span>
                <span class="system-ai-config__toggle-description">控制是否对所有用户生效</span>
              </div>
              <ElSwitch v-model="form.enabled" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ElFormItem label="API 地址基准 (Base URL)" prop="baseUrl">
                <ElInput v-model="form.baseUrl" placeholder="https://api.openai.com/v1" class="system-ai-config__input" />
              </ElFormItem>
              <ElFormItem label="默认模型名称" prop="defaultModel">
                <ElInput v-model="form.defaultModel" placeholder="gpt-4o-mini" class="system-ai-config__input" />
              </ElFormItem>
            </div>

            <ElFormItem label="API Key" prop="apiKey">
              <ElInput v-model="form.apiKey" type="password" placeholder="输入新的 Key 以前置保存" show-password class="system-ai-config__input" />
              <div class="system-ai-config__secret-hint">
                <SvgIcon category="ui" icon="info" size="1rem" class="text-primary" />
                <span>API Key 将以非对称加密方式存储。</span>
                <ElCheckbox v-model="form.clearApiKey" class="ml-auto !h-auto !mr-0">
                  <span class="text-[11px]">清空现有 Key</span>
                </ElCheckbox>
              </div>
            </ElFormItem>

            <ElButton type="primary" class="system-ai-config__submit" :disabled="isSaving" native-type="submit">
              <SvgIcon v-if="isSaving" category="ui" icon="spinner-orbit" size="1rem" class="mr-2 animate-spin" />
              {{ isSaving ? '保存中...' : '提交全局配置生效' }}
            </ElButton>
          </ElForm>
        </ElCard>
        <ElCard shadow="never" body-class="system-ai-config__card-body" class="system-ai-config__status-card">
          <div class="system-ai-config__status-header">
            <SvgIcon category="ui" icon="eye" size="1.25rem" class="text-secondary" />
            <h3 class="text-lg font-bold text-main">
              当前生效状态
            </h3>
          </div>

          <div class="system-ai-config__status-content">
            <div class="flex flex-col gap-1">
              <span class="text-[10px] font-bold uppercase tracking-widest text-secondary">运行状态</span>
              <div class="flex items-center gap-2">
                <div class="system-ai-config__status-dot" :class="configStatusStateClass" />
                <span class="system-ai-config__status-label" :class="configStatusStateClass">{{ configStatusLabel }}</span>
              </div>
            </div>

            <div class="grid gap-5 text-sm">
              <div class="system-ai-config__summary-row">
                <span class="text-secondary">API 基准</span>
                <span class="text-main font-mono text-xs">{{ currentConfig?.baseUrl || '-' }}</span>
              </div>
              <div class="system-ai-config__summary-row">
                <span class="text-secondary">模型代号</span>
                <span class="text-main font-mono text-xs">{{ currentConfig?.defaultModel || '-' }}</span>
              </div>
              <div class="system-ai-config__summary-row">
                <span class="text-secondary">Key 密文</span>
                <span class="text-main font-mono text-xs">{{ currentConfig?.maskedApiKey || '未设置' }}</span>
              </div>
              <div class="system-ai-config__summary-row">
                <span class="text-secondary">变更者</span>
                <span class="text-main">{{ currentConfig?.updatedByDisplayName || '系统' }}</span>
              </div>
            </div>
          </div>

          <div v-if="currentConfig?.updatedAt" class="system-ai-config__updated-at">
            <SvgIcon category="ui" icon="time" size="0.875rem" />
            <span>最后更新于 {{ formatDateTime(currentConfig.updatedAt) }}</span>
          </div>
        </ElCard>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.system-ai-config {
  .system-ai-config__card-body {
    padding: 2rem !important;
  }

  .system-ai-config__form-card {
    border-color: color-mix(in srgb, var(--brand-border-base) 80%, transparent);

    @media (min-width: 1024px) {
      grid-column: span 7 / span 7;
    }
  }

  .system-ai-config__status-card {
    display: flex;
    flex-direction: column;
    height: 100%;
    border-style: dashed;
    border-color: color-mix(in srgb, var(--brand-border-base) 80%, transparent);
    background: color-mix(in srgb, var(--brand-bg-sidebar) 30%, transparent);

    @media (min-width: 1024px) {
      grid-column: span 5 / span 5;
    }
  }

  .system-ai-config__panel-header,
  .system-ai-config__status-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .system-ai-config__status-header {
    margin-bottom: 1.5rem;
  }

  .system-ai-config__panel-description {
    margin-bottom: 2rem;
    color: var(--brand-text-secondary);
    font-size: 0.875rem;
  }

  .system-ai-config__toggle-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border: 1px solid var(--brand-border-base);
    border-radius: 0.75rem;
    background: var(--brand-bg-sidebar);
  }

  .system-ai-config__toggle-description {
    margin-top: 0.25rem;
    color: var(--brand-text-secondary);
    font-size: 0.75rem;
  }

  .system-ai-config__secret-hint {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin-top: 0.5rem;
    color: var(--brand-text-secondary);
    font-size: 11px;
  }

  .system-ai-config__submit {
    box-shadow: 0 10px 15px -3px color-mix(in srgb, var(--brand-primary) 20%, transparent);
    width: 100% !important;
  }

  .system-ai-config__status-content {
    flex: 1 1 0%;

    > * + * {
      margin-top: 1.5rem;
    }
  }

  .system-ai-config__status-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 9999px;

    &.enabled {
      background: var(--brand-success);
    }

    &.disabled {
      background: var(--brand-error);
    }
  }

  .system-ai-config__status-label {
    font-size: 0.875rem;
    font-weight: 600;

    &.enabled {
      color: var(--brand-success);
    }

    &.disabled {
      color: var(--brand-error);
    }
  }

  .system-ai-config__summary-row {
    display: flex;
    justify-content: space-between;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--brand-border-base);
  }

  .system-ai-config__updated-at {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid var(--brand-border-base);
    color: var(--brand-text-secondary);
    font-size: 11px;
  }

  .system-ai-config__input {
    :deep(.el-input__wrapper) {
      background-color: var(--brand-fill-lighter);
      border-radius: 8px;
      box-shadow: none !important;
      border: 1px solid var(--brand-border-base);

      &.is-focus {
        border-color: var(--el-color-primary);
        background-color: white;
      }
    }
  }
}
</style>
