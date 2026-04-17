<script setup lang="ts">
import type { TiptapEditorContent, TiptapEditorHandleKeyDown } from '../../core/typing'
import type { DocumentTitleEditorEmits, DocumentTitleEditorProps } from './typing'
import { computed } from 'vue'
import TiptapEditor from '../../core/TiptapEditor.vue'
import { fromTitleEditorContent, toTitleEditorContent } from '../../core/utils'
import { createTitleExtensions } from '../../extensions/createExtensions'

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
    :initial-extensions="titleEditorExtensions"
    :editable="props.editable"
    :handle-key-down="handleTitleEditorKeyDown"
    @update:content="handleUpdateTitle"
  />
</template>

<style scoped lang="scss">
.document-title-editor {
  --tiptap-content-min-height: auto;
  --tiptap-prosemirror-min-height: auto;
  --tiptap-prosemirror-height: auto;
  --tiptap-prosemirror-color: var(--brand-text-primary);
  --tiptap-prosemirror-font-size: 1.6rem;
  --tiptap-prosemirror-font-weight: 700;
  --tiptap-prosemirror-line-height: 1.2;
  --tiptap-prosemirror-letter-spacing: -0.02em;
  --tiptap-placeholder-color: var(--brand-text-placeholder);
  min-height: auto;
  height: auto;
}
</style>
