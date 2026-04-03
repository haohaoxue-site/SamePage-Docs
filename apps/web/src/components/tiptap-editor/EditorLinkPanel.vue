<script setup lang="ts">
import type { EditorLinkPanelEmits } from './typing'

const emits = defineEmits<EditorLinkPanelEmits>()

const model = defineModel<string>({ required: true })
</script>

<template>
  <div class="editor-link-panel">
    <SvgIcon category="ui" icon="link" size="1rem" class="editor-link-panel__icon" />
    <ElInput
      v-model="model"
      class="editor-link-panel__input"
      placeholder="输入或粘贴链接..."
    />
    <div class="editor-link-panel__actions">
      <ElButton
        class="editor-link-panel__action"
        size="small"
        type="primary"
        @click="emits('apply')"
      >
        确认
      </ElButton>
      <ElButton
        class="editor-link-panel__action"
        size="small"
        @click="emits('cancel')"
      >
        取消
      </ElButton>
    </div>
  </div>
</template>

<style scoped lang="scss">
.editor-link-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-bottom: 1px solid var(--brand-border-base);
  background: var(--brand-bg-surface-raised);
  box-shadow: 0 1px 2px 0 color-mix(in srgb, var(--brand-text-primary) 5%, transparent);

  .editor-link-panel__icon {
    margin-left: 0.25rem;
    color: var(--brand-text-secondary);
  }

  .editor-link-panel__input {
    flex: 1 1 0%;
    min-width: min(360px, 100%);

    :deep(.el-input__wrapper) {
      background-color: var(--brand-bg-surface);
      border-radius: 6px;
      box-shadow: none !important;
      border: 1px solid var(--brand-border-base);

      &.is-focus {
        border-color: var(--el-color-primary);
        background-color: var(--brand-bg-surface-raised);
      }
    }
  }

  .editor-link-panel__actions {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin-left: auto;
  }

  .editor-link-panel__action {
    margin-left: 0 !important;
  }
}
</style>
