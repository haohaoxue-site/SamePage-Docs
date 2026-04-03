<script setup lang="ts">
import type {
  ChatProviderSettingsDialogEmits,
  ChatProviderSettingsDialogProps,
} from '../typing'
import type { ChatProviderConfig } from '@/apis/chat'

defineProps<ChatProviderSettingsDialogProps>()
const emits = defineEmits<ChatProviderSettingsDialogEmits>()
const visible = defineModel<boolean>({ required: true })
const form = defineModel<ChatProviderConfig>('form', { required: true })
</script>

<template>
  <ElDialog
    v-model="visible"
    title="配置 AI 提供商"
    width="580"
    align-center
  >
    <div class="chat-provider-settings">
      <div class="chat-provider-settings__intro">
        <div class="chat-provider-settings__intro-title">
          OpenAI Compatible 配置
        </div>
        <div class="chat-provider-settings__intro-description">
          Cherry Studio 一类客户端通常会调用 <span class="font-mono text-main">/models</span> 接口获取模型列表，这里也沿用同样方式。
        </div>
      </div>

      <ElForm :model="form" label-position="top" class="chat-provider-settings__form">
        <ElFormItem label="API 地址">
          <ElInput
            v-model="form.baseUrl"
            placeholder="https://api.openai.com/v1"
          />
        </ElFormItem>

        <ElFormItem label="API Key">
          <ElInput
            v-model="form.apiKey"
            type="password"
            show-password
            placeholder="sk-..."
          />
        </ElFormItem>

        <ElFormItem label="模型">
          <div class="chat-provider-settings__model-row">
            <ElSelect
              v-model="form.model"
              class="chat-provider-settings__model-select"
              filterable
              allow-create
              default-first-option
              clearable
              placeholder="先拉取模型，或直接输入模型名"
            >
              <ElOption
                v-for="model in models"
                :key="model.id"
                :label="model.ownedBy ? `${model.id} · ${model.ownedBy}` : model.id"
                :value="model.id"
              />
            </ElSelect>

            <ElButton
              :loading="isLoadingModels"
              @click="emits('refreshModels')"
            >
              拉取模型
            </ElButton>
          </div>
        </ElFormItem>
      </ElForm>
    </div>

    <template #footer>
      <div class="chat-provider-settings__footer">
        <ElButton @click="visible = false">
          取消
        </ElButton>
        <ElButton type="primary" @click="emits('save')">
          保存配置
        </ElButton>
      </div>
    </template>
  </ElDialog>
</template>

<style scoped lang="scss">
.chat-provider-settings {
  > * + * {
    margin-top: 1.25rem;
  }

  .chat-provider-settings__intro {
    padding: 0.75rem 1rem;
    border: 1px solid color-mix(in srgb, var(--brand-border-base) 80%, transparent);
    border-radius: 1rem;
    background: var(--brand-fill-lighter);
  }

  .chat-provider-settings__intro-title {
    color: var(--brand-text-primary);
    font-size: 0.875rem;
    font-weight: 600;
  }

  .chat-provider-settings__intro-description {
    margin-top: 0.25rem;
    color: var(--brand-text-secondary);
    font-size: 0.75rem;
    line-height: 1.25rem;
  }

  .chat-provider-settings__form {
    > * + * {
      margin-top: 1rem;
    }
  }

  .chat-provider-settings__model-row {
    display: flex;
    width: 100%;
    gap: 0.75rem;
  }

  .chat-provider-settings__model-select {
    width: 100%;
  }

  .chat-provider-settings__footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
  }
}
</style>
