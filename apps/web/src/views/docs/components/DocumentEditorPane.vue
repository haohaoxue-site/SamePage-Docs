<script setup lang="ts">
import type { DocumentEditorPaneEmits, DocumentEditorPaneProps } from '../typing'
import { useDocumentEditorPane } from '../composables/useDocumentEditorPane'
import DocumentEditor from './DocumentEditor.vue'
import DocumentEditorFallback from './DocumentEditorFallback.vue'

const props = defineProps<DocumentEditorPaneProps>()
const emits = defineEmits<DocumentEditorPaneEmits>()
const { contentError, handleContentError, handleRetryLoad, shouldShowEditor } = useDocumentEditorPane({
  onRetryLoad: () => emits('retryLoad'),
  props,
})
</script>

<template>
  <section class="document-editor-pane">
    <DocumentEditor
      v-if="shouldShowEditor && props.document"
      :document="props.document"
      :metadata="props.metadata"
      :mode="props.mode"
      @update-title="emits('updateTitle', $event)"
      @update-content="emits('updateContent', $event)"
      @content-error="handleContentError"
      @request-comment="emits('requestComment', $event)"
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
