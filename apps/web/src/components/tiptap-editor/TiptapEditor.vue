<script setup lang="ts">
import type { TiptapEditorProps } from './types'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { onBeforeUnmount, watch } from 'vue'

const props = defineProps<TiptapEditorProps>()
const emit = defineEmits<{
  'update:content': [content: string]
}>()

const editor = useEditor({
  content: props.content,
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
    }),
    Placeholder.configure({
      placeholder: '输入 / 唤起命令，或者直接开始写作。',
    }),
  ],
  editorProps: {
    attributes: {
      class: 'editor-surface__content',
    },
  },
  onUpdate: emitUpdatedContent,
})

defineExpose({
  editor,
})

function emitUpdatedContent() {
  if (!editor.value) {
    return
  }

  emit('update:content', editor.value.getHTML())
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
</script>

<template>
  <ElCard
    shadow="never"
    body-class="!flex !min-h-0 !flex-1 !flex-col !p-0"
    class="flex h-full min-h-full min-w-0 flex-1 flex-col overflow-visible !border-none bg-white"
  >
    <EditorContent v-if="editor" :editor="editor" class="min-h-0 flex-1" />
  </ElCard>
</template>

<style scoped lang="scss">
:deep(.editor-surface__content) {
  box-sizing: border-box;
  min-height: max(100%, 500px);
  outline: none;
  font-size: 16px;
  line-height: 1.8;
  color: var(--el-text-color-primary);

  h1, h2, h3 {
    font-weight: 700;
    margin-top: 2em;
    margin-bottom: 0.5em;
    color: var(--el-text-color-primary);
  }

  h1 { font-size: 2.2em; border-bottom: 1px solid var(--el-border-color-light); padding-bottom: 0.3em; }
  h2 { font-size: 1.6em; }
  h3 { font-size: 1.3em; }

  p { margin-bottom: 1.25em; }

  ul, ol {
    padding-left: 1.5em;
    margin-bottom: 1.25em;
    li { margin-bottom: 0.5em; }
  }

  blockquote {
    border-left: 4px solid var(--el-color-primary);
    padding-left: 1rem;
    color: var(--el-text-color-secondary);
    font-style: italic;
    margin: 1.5em 0;
  }

  p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    color: var(--el-text-color-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }

  hr {
    border: none;
    border-top: 1px solid var(--el-border-color);
    margin: 2em 0;
  }
}
</style>
