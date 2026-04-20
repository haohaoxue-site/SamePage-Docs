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
