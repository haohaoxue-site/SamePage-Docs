<script setup lang="ts">
import type { DocumentBodyEditorEmits, DocumentBodyEditorProps } from './typing'
import { createBodyExtensions } from '../helpers/createExtensions'
import TiptapEditor from '../TiptapEditor.vue'

const props = defineProps<DocumentBodyEditorProps>()
const emits = defineEmits<DocumentBodyEditorEmits>()
const bodyEditorExtensions = createBodyExtensions()
</script>

<template>
  <TiptapEditor
    class="document-body-editor"
    :content="props.content"
    :extensions="bodyEditorExtensions"
    show-bubble-toolbar
    @update:content="emits('update:content', $event)"
    @content-error="emits('contentError', $event)"
  />
</template>

<style scoped lang="scss">
.document-body-editor {
  flex: 1 1 0%;
  min-height: 0;
}
</style>
