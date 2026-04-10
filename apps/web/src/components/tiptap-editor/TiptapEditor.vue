<script setup lang="ts">
import type { TiptapEditorEmits, TiptapEditorProps } from './typing'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import { TextStyle } from '@tiptap/extension-text-style'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { onBeforeUnmount, watch } from 'vue'
import BubbleToolbar from './bubble-menu/BubbleToolbar.vue'
import { ResetMarksOnPlainEnter } from './extensions/ResetMarksOnPlainEnter'

const props = defineProps<TiptapEditorProps>()
const emits = defineEmits<TiptapEditorEmits>()

const editor = useEditor({
  content: props.content,
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
      link: {
        openOnClick: false,
      },
    }),
    Placeholder.configure({
      placeholder: '输入 / 唤起命令，或者直接开始写作。',
    }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    Image.configure({
      inline: true,
    }),
    ResetMarksOnPlainEnter,
  ],
  editorProps: {
    attributes: {
      class: 'editor-surface__content',
    },
  },
  onUpdate: emitUpdatedContent,
})

function emitUpdatedContent() {
  if (!editor.value) {
    return
  }

  emits('update:content', editor.value.getHTML())
}

function syncEditorContent(content: string) {
  if (!editor.value) {
    return
  }

  const currentContent = editor.value.getHTML()

  if (currentContent === content) {
    return
  }

  editor.value.commands.setContent(content, {
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

onBeforeUnmount(destroyEditor)

defineExpose({
  editor,
})
</script>

<template>
  <section class="tiptap-editor">
    <BubbleToolbar v-if="editor" :editor="editor" />
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
