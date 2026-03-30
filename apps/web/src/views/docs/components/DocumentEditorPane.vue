<script setup lang="ts">
import type { DocumentNodeDetail } from '@haohaoxue/samepage-domain'
import { TiptapEditor } from '@/components/tiptap-editor'

defineProps<{
  document: DocumentNodeDetail | null
  isLoading: boolean
}>()

const emit = defineEmits<{
  updateTitle: [title: string]
  updateContent: [content: string]
}>()
</script>

<template>
  <section class="flex min-h-0 flex-1 flex-col">
    <template v-if="document">
      <div class="border-b border-border/80 px-8 py-6">
        <ElInput
          data-testid="document-title-input"
          :model-value="document.title"
          class="document-title-input"
          placeholder="输入文档标题"
          @input="emit('updateTitle', $event)"
        />
      </div>

      <div class="flex min-h-0 flex-1 overflow-y-auto px-8 py-8">
        <div data-testid="document-editor-pane" class="flex min-h-full flex-1 flex-col">
          <TiptapEditor
            class="flex min-h-full flex-1 flex-col"
            :content="document.content"
            @update:content="emit('updateContent', $event)"
          />
        </div>
      </div>
    </template>

    <div
      v-else
      class="flex flex-1 items-center justify-center px-8 py-10"
    >
      <ElEmpty :description="isLoading ? '加载中...' : '未选择文档'">
        <template #image>
          <div
            class="mx-auto h-16 w-16 flex items-center justify-center rounded-[24px] bg-primary/10 text-primary"
          >
            <div :class="isLoading ? 'i-carbon-progress-bar-round animate-spin' : 'i-carbon-document-add'" class="text-3xl" />
          </div>
        </template>
      </ElEmpty>
    </div>
  </section>
</template>

<style scoped lang="scss">
.document-title-input {
  :deep(.el-input__wrapper) {
    padding: 0;
    background: transparent;
    box-shadow: none;
  }

  :deep(.el-input__inner) {
    height: auto;
    padding: 0;
    font-size: 2.25rem;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.02em;
    color: #1f2329;
  }

  :deep(.el-input__inner::placeholder) {
    color: #c5c9d0;
  }
}
</style>
