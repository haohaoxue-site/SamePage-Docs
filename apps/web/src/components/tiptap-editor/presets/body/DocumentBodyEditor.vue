<script setup lang="ts">
import type { Editor } from '@tiptap/core'
import type { BlockTriggerMenuExposed } from '../../overlays/block-trigger/typing'
import type { DocumentBodyEditorEmits, DocumentBodyEditorProps } from './typing'
import { shallowRef, useTemplateRef } from 'vue'
import TiptapEditor from '../../core/TiptapEditor.vue'
import BlockTriggerMenu from '../../overlays/block-trigger/BlockTriggerMenu.vue'
import BubbleToolbar from '../../overlays/bubble-toolbar/BubbleToolbar.vue'
import { useDocumentBodyEditor } from './useDocumentBodyEditor'

const props = withDefaults(defineProps<DocumentBodyEditorProps>(), {
  editable: true,
  documentId: null,
})
const emits = defineEmits<DocumentBodyEditorEmits>()
const bodyEditor = shallowRef<Editor | null>(null)
const blockTriggerMenuRef = useTemplateRef<BlockTriggerMenuExposed>('blockTriggerMenu')
const {
  bodyEditorExtensions,
  handleBodyEditorChange,
  handleBodyEditorKeyDown,
  handleCommentRequest,
  handleUploadFile,
  handleUploadImage,
} = useDocumentBodyEditor({
  bodyEditor,
  blockTriggerMenuRef,
  props,
  onRequestComment: request => emits('requestComment', request),
})
</script>

<template>
  <section class="document-body-editor">
    <BubbleToolbar
      v-if="bodyEditor && props.editable"
      :editor="bodyEditor"
      @request-comment="handleCommentRequest"
    />

    <TiptapEditor
      class="document-body-editor__surface"
      :content="props.content"
      :initial-extensions="bodyEditorExtensions"
      :editable="props.editable"
      :handle-key-down="handleBodyEditorKeyDown"
      @update:content="emits('update:content', $event)"
      @content-error="emits('contentError', $event)"
      @editor-change="handleBodyEditorChange"
    />

    <BlockTriggerMenu
      v-if="bodyEditor && props.editable"
      ref="blockTriggerMenu"
      :editor="bodyEditor"
      :upload-image="handleUploadImage"
      :upload-file="handleUploadFile"
      @request-comment="handleCommentRequest"
    />
  </section>
</template>

<style scoped lang="scss">
.document-body-editor {
  flex: 1 1 0%;
  min-height: 0;

  &__surface {
    flex: 1 1 0%;
    min-height: 0;
  }
}
</style>
