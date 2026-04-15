<script setup lang="ts">
import type { FormInstance } from 'element-plus'
import type {
  ChatProviderSettingsDialogEmits,
  ChatProviderSettingsDialogProps,
} from '../typing'
import type { ChatModelSelection } from '@/apis/chat'
import { useTemplateRef } from 'vue'
import { useChatProviderSettingsDialog } from '../composables/useChatProviderSettingsDialog'

const props = defineProps<ChatProviderSettingsDialogProps>()
const emits = defineEmits<ChatProviderSettingsDialogEmits>()
const visible = defineModel<boolean>({ required: true })
const form = defineModel<ChatModelSelection>('form', { required: true })
const providerFormRef = useTemplateRef<FormInstance>('providerFormRef')
const { formRules, handleRefreshModels, handleSave } = useChatProviderSettingsDialog({
  form,
  providerFormRef,
  onRefreshModels: () => emits('refreshModels'),
  onSave: () => emits('save'),
})
</script>

<template>
  <ElDialog
    v-model="visible"
    title="选择模型"
    width="520"
    align-center
  >
    <div class="chat-provider-settings">
      <p class="chat-provider-settings__description">
        可用模型会在打开弹窗时自动刷新，必要时也可以手动刷新一次。
      </p>

      <ElForm ref="providerFormRef" :model="form" :rules="formRules" label-position="top" class="chat-provider-settings__form">
        <ElFormItem label="模型" prop="model">
          <div class="chat-provider-settings__model-row">
            <ElSelect
              v-model="form.model"
              class="chat-provider-settings__model-select"
              filterable
              clearable
              placeholder="请选择模型"
            >
              <ElOption
                v-for="model in props.models"
                :key="model.id"
                :label="model.ownedBy ? `${model.id} · ${model.ownedBy}` : model.id"
                :value="model.id"
              />
            </ElSelect>

            <ElButton
              :loading="props.isLoadingModels"
              @click="handleRefreshModels"
            >
              刷新
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
        <ElButton type="primary" @click="handleSave">
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

  .chat-provider-settings__description {
    margin: 0;
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
