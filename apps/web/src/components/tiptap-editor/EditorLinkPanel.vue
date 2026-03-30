<script setup lang="ts">
const emit = defineEmits<{
  apply: []
  cancel: []
}>()

const model = defineModel<string>({ required: true })
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-2 border-b border-border bg-white p-3 shadow-sm"
  >
    <div class="i-carbon-link text-secondary ml-1" />
    <ElInput
      v-model="model"
      class="min-w-[min(360px,100%)] flex-1 custom-input"
      placeholder="输入或粘贴链接..."
      data-testid="link-input"
    />
    <div class="flex items-center gap-1.5 ml-auto">
      <ElButton
        class="!ml-0"
        size="small"
        type="primary"
        data-testid="link-apply"
        @click="emit('apply')"
      >
        确认
      </ElButton>
      <ElButton
        class="!ml-0"
        size="small"
        data-testid="link-cancel"
        @click="emit('cancel')"
      >
        取消
      </ElButton>
    </div>
  </div>
</template>

<style scoped lang="scss">
.custom-input {
  :deep(.el-input__wrapper) {
    background-color: #f9fafb;
    border-radius: 6px;
    box-shadow: none !important;
    border: 1px solid #ebedef;

    &.is-focus {
      border-color: var(--el-color-primary);
      background-color: #fff;
    }
  }
}
</style>
