<script setup lang="ts">
import type { TiptapEditorContent, TiptapEditorHandleKeyDown } from '../typing'
import type { DocumentTitleEditorEmits, DocumentTitleEditorProps } from './typing'
import { computed } from 'vue'
import { createTitleExtensions } from '../helpers/createExtensions'
import TiptapEditor from '../TiptapEditor.vue'
import { fromTitleEditorContent, toTitleEditorContent } from '../utils'

const props = defineProps<DocumentTitleEditorProps>()
const emits = defineEmits<DocumentTitleEditorEmits>()

const titleEditorContent = computed(() => toTitleEditorContent(props.title))
const titleEditorExtensions = createTitleExtensions()
const handleTitleEditorKeyDown: TiptapEditorHandleKeyDown = (_, event) => event.key === 'Enter'

function handleUpdateTitle(content: TiptapEditorContent) {
  emits('update:title', fromTitleEditorContent(content))
}
</script>

<template>
  <TiptapEditor
    class="document-title-editor"
    :content="titleEditorContent"
    :extensions="titleEditorExtensions"
    :handle-key-down="handleTitleEditorKeyDown"
    @update:content="handleUpdateTitle"
  />
</template>

<style scoped lang="scss">
.document-title-editor {
  min-height: auto;
  height: auto;

  :deep(.tiptap-editor__content) {
    min-height: auto;
  }

  :deep(.tiptap-editor__prosemirror) {
    min-height: auto;
    height: auto;
    padding: 0;
    font-size: 1.6rem;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.02em;
    color: var(--brand-text-primary);
    outline: none;
  }

  :deep(.tiptap-editor__prosemirror p.is-editor-empty:first-child::before) {
    color: var(--brand-text-placeholder);
  }
}
</style>
