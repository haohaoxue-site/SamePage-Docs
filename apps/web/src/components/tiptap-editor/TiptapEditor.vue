<script setup lang="ts">
import type { TiptapEditorContent, TiptapEditorEmits, TiptapEditorProps } from './typing'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { onBeforeUnmount, watch } from 'vue'
import { unwrapTiptapContent, wrapTiptapContent } from './utils'

const props = withDefaults(defineProps<TiptapEditorProps>(), {
  editable: true,
})
const emits = defineEmits<TiptapEditorEmits>()

const editor = useEditor({
  content: wrapTiptapContent(props.content),
  extensions: props.extensions,
  editable: props.editable,
  enableContentCheck: true,
  editorProps: {
    attributes: {
      class: 'tiptap-editor__prosemirror',
    },
    handleKeyDown: props.handleKeyDown,
  },
  onContentError: handleContentError,
  onUpdate: emitUpdatedContent,
})

function emitUpdatedContent() {
  if (!editor.value) {
    return
  }

  emits('update:content', unwrapTiptapContent(editor.value.getJSON()))
}

function handleContentError(options: { error: Error }) {
  emits('contentError', options.error)
}

function isSameContent(content: TiptapEditorContent) {
  if (!editor.value) {
    return false
  }

  return JSON.stringify(unwrapTiptapContent(editor.value.getJSON())) === JSON.stringify(content)
}

function syncEditorContent(content: TiptapEditorContent) {
  if (!editor.value) {
    return
  }

  if (isSameContent(content)) {
    return
  }

  editor.value.commands.setContent(wrapTiptapContent(content), {
    emitUpdate: false,
  })
}

function destroyEditor() {
  editor.value?.destroy()
}

watch(
  () => props.content,
  syncEditorContent,
)

watch(
  () => props.editable,
  (nextEditable) => {
    editor.value?.setEditable(nextEditable, false)
  },
)

onBeforeUnmount(destroyEditor)

defineExpose({
  editor,
})
</script>

<template>
  <section class="tiptap-editor">
    <EditorContent v-if="editor" :editor="editor" class="tiptap-editor__content" />
  </section>
</template>

<style scoped lang="scss">
.tiptap-editor {
  display: flex;
  flex: 1 1 0%;
  flex-direction: column;
  min-width: 0;
  min-height: 100%;
  height: 100%;
  overflow: visible;
  background: transparent;
  border: none;

  .tiptap-editor__content {
    flex: 1 1 0%;
    min-height: 0;
  }
}
</style>
