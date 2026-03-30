<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useSystemAiConfig } from './composables/useSystemAiConfig'

const {
  currentConfig,
  errorMessage,
  form,
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

onMounted(loadConfig)
</script>

<template>
  <div v-loading="isLoading" class="space-y-6 py-6 font-sans">
    <ElAlert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="rounded-xl" />

    <template v-if="!isLoading && !errorMessage">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <ElCard shadow="never" body-class="!p-8" class="lg:col-span-7 border-border/80">
          <div class="flex items-center gap-3 mb-2">
            <div class="i-carbon-settings text-primary text-xl" />
            <h3 class="text-xl font-bold text-main">
              系统 AI 参数配置
            </h3>
          </div>
          <p class="text-sm text-secondary mb-8">
            配置系统级 AI 默认参数。
          </p>

          <ElForm :model="form" label-position="top" class="space-y-6" @submit.prevent="saveConfig">
            <div class="flex items-center justify-between p-4 bg-sidebar rounded-xl border border-border">
              <div class="flex flex-col">
                <span class="text-sm font-semibold text-main">启用系统级配置</span>
                <span class="text-xs text-secondary mt-1">控制是否对所有用户生效</span>
              </div>
              <ElSwitch v-model="form.enabled" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ElFormItem label="API 地址基准 (Base URL)">
                <ElInput v-model="form.baseUrl" placeholder="https://api.openai.com/v1" class="custom-input" />
              </ElFormItem>
              <ElFormItem label="默认模型名称">
                <ElInput v-model="form.defaultModel" placeholder="gpt-4o-mini" class="custom-input" />
              </ElFormItem>
            </div>

            <ElFormItem label="API Key">
              <ElInput v-model="form.apiKey" type="password" placeholder="输入新的 Key 以前置保存" show-password class="custom-input" />
              <div class="mt-2 text-[11px] text-secondary flex items-center gap-1.5">
                <div class="i-carbon-information text-primary" />
                <span>API Key 将以非对称加密方式存储。</span>
                <ElCheckbox v-model="form.clearApiKey" class="ml-auto !h-auto !mr-0">
                  <span class="text-[11px]">清空现有 Key</span>
                </ElCheckbox>
              </div>
            </ElFormItem>

            <ElButton type="primary" class="!w-full shadow-lg shadow-primary/20" :disabled="isSaving" native-type="submit">
              <div v-if="isSaving" class="i-carbon-progress-bar-round animate-spin mr-2" />
              {{ isSaving ? '保存中...' : '提交全局配置生效' }}
            </ElButton>
          </ElForm>
        </ElCard>
        <ElCard shadow="never" body-class="!p-8" class="lg:col-span-5 border-border/80 bg-sidebar/30 flex flex-col h-full border-dashed">
          <div class="flex items-center gap-3 mb-6">
            <div class="i-carbon-view text-secondary text-xl" />
            <h3 class="text-lg font-bold text-main">
              当前生效状态
            </h3>
          </div>

          <div class="space-y-6 flex-1">
            <div class="flex flex-col gap-1">
              <span class="text-[10px] font-bold uppercase tracking-widest text-[#8f959e]">运行状态</span>
              <div class="flex items-center gap-2">
                <div :class="currentConfig?.enabled ? 'bg-green-500' : 'bg-red-500'" class="w-2 h-2 rounded-full" />
                <span class="text-sm font-semibold" :class="currentConfig?.enabled ? 'text-green-600' : 'text-red-600'">{{ configStatusLabel }}</span>
              </div>
            </div>

            <div class="grid gap-5 text-sm">
              <div class="flex justify-between border-b border-border pb-2">
                <span class="text-secondary">API 基准</span>
                <span class="text-main font-mono text-xs">{{ currentConfig?.baseUrl || '-' }}</span>
              </div>
              <div class="flex justify-between border-b border-border pb-2">
                <span class="text-secondary">模型代号</span>
                <span class="text-main font-mono text-xs">{{ currentConfig?.defaultModel || '-' }}</span>
              </div>
              <div class="flex justify-between border-b border-border pb-2">
                <span class="text-secondary">Key 密文</span>
                <span class="text-main font-mono text-xs">{{ currentConfig?.maskedApiKey || '未设置' }}</span>
              </div>
              <div class="flex justify-between border-b border-border pb-2">
                <span class="text-secondary">变更者</span>
                <span class="text-main">{{ currentConfig?.updatedByDisplayName || '系统' }}</span>
              </div>
            </div>
          </div>

          <div v-if="currentConfig?.updatedAt" class="mt-8 pt-4 border-t border-border flex items-center gap-2 text-[11px] text-secondary">
            <div class="i-carbon-time" />
            <span>最后更新于 {{ new Date(currentConfig.updatedAt).toLocaleString('zh-CN', { hour12: false }) }}</span>
          </div>
        </ElCard>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.custom-input {
  :deep(.el-input__wrapper) {
    background-color: #f9fafb;
    border-radius: 8px;
    box-shadow: none !important;
    border: 1px solid #ebedef;

    &.is-focus {
      border-color: var(--el-color-primary);
      background-color: #fff;
    }
  }
}
</style>
