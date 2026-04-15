<script setup lang="ts">
import type { DocumentEditorPaneEmits, DocumentEditorPaneProps } from '../typing'
import { DOCUMENT_PANE_STATE } from '@haohaoxue/samepage-contracts'
import { computed, shallowRef, watch } from 'vue'
import DocumentEditor from './DocumentEditor.vue'
import DocumentEditorFallback from './DocumentEditorFallback.vue'

const props = defineProps<DocumentEditorPaneProps>()
const emits = defineEmits<DocumentEditorPaneEmits>()

const contentError = shallowRef<Error | null>(null)

const shouldShowEditor = computed(() =>
  Boolean(props.document)
  && props.paneState === DOCUMENT_PANE_STATE.READY
  && !contentError.value,
)

watch(
  () => props.document
    ? JSON.stringify({
        title: props.document.title,
        body: props.document.body,
      })
    : null,
  () => {
    contentError.value = null
  },
)

function handleContentError(error: Error) {
  contentError.value = error
}

function handleRetryLoad() {
  contentError.value = null
  emits('retryLoad')
}
</script>

<template>
  <section class="document-editor-pane">
    <DocumentEditor
      v-if="shouldShowEditor && document"
      :document="document"
      @update-title="emits('updateTitle', $event)"
      @update-content="emits('updateContent', $event)"
      @content-error="handleContentError"
    />

    <DocumentEditorFallback
      v-else
      :pane-state="props.paneState"
      :is-loading="props.isLoading"
      :has-fallback-document="props.hasFallbackDocument"
      :content-error="contentError"
      @create-document="emits('createDocument')"
      @open-fallback-document="emits('openFallbackDocument')"
      @retry-load="handleRetryLoad"
    />
  </section>
</template>

<style scoped lang="scss">
.document-editor-pane {
  display: flex;
  flex: 1 1 0%;
  flex-direction: column;
  min-height: 0;
}
</style>
