<script setup lang="ts">
defineProps<{
  isBusy: boolean
}>()

defineEmits<{
  createRoot: []
}>()
</script>

<template>
  <ElButton
    data-testid="docs-create-root"
    text
    class="!h-7 !w-7 !rounded-lg !p-0 !text-secondary hover:!bg-white hover:!text-primary disabled:!opacity-40"
    :disabled="isBusy"
    title="新建文档"
    @click="$emit('createRoot')"
  >
    <div :class="isBusy ? 'i-carbon-progress-bar-round animate-spin' : 'i-carbon-add'" class="text-base" />
  </ElButton>
</template>
