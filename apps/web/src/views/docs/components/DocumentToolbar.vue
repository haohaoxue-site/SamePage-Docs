<script setup lang="ts">
import type {
  DocumentToolbarEmits,
  DocumentToolbarProps,
} from '../typing'

defineProps<DocumentToolbarProps>()

defineEmits<DocumentToolbarEmits>()
</script>

<template>
  <ElButton
    text
    class="document-tree-toolbar document-tree-toolbar__button"
    :disabled="isBusy"
    title="新建文档"
    @click="$emit('createRoot')"
  >
    <SvgIcon category="ui" :icon="isBusy ? 'spinner-orbit' : 'plus'" size="1rem" :class="{ 'animate-spin': isBusy }" />
  </ElButton>
</template>

<style scoped lang="scss">
.document-tree-toolbar {
  &.document-tree-toolbar__button {
    color: var(--brand-text-secondary);
    width: 1.75rem !important;
    height: 1.75rem !important;
    padding: 0 !important;
    border-radius: 0.5rem !important;

    &:hover {
      color: var(--brand-primary);
      background: var(--brand-bg-surface-raised);
    }

    &:disabled {
      opacity: 0.4 !important;
    }
  }
}
</style>
