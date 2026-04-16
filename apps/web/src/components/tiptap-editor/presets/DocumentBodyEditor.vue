<script setup lang="ts">
import type { BlockTriggerMenuExposed } from '../trigger-menu/BlockTriggerMenu.vue'
import type { TiptapEditorExposed, TiptapEditorHandleKeyDown } from '../typing'
import type { DocumentBodyEditorEmits, DocumentBodyEditorProps } from './typing'
import { computed, useTemplateRef } from 'vue'
import {
  uploadDocumentFile,
  uploadDocumentImage,
} from '@/apis/document'
import BubbleToolbar from '../bubble-menu/BubbleToolbar.vue'
import { createBodyExtensions } from '../helpers/createExtensions'
import { isTriggerMenuSelection } from '../helpers/triggerMenu'
import TiptapEditor from '../TiptapEditor.vue'
import BlockTriggerMenu from '../trigger-menu/BlockTriggerMenu.vue'

const props = withDefaults(defineProps<DocumentBodyEditorProps>(), {
  editable: true,
  documentId: null,
})
const emits = defineEmits<DocumentBodyEditorEmits>()
async function handleUploadImage(file: File) {
  if (!props.documentId) {
    throw new Error('当前文档未初始化，无法上传图片')
  }

  return uploadDocumentImage(props.documentId, file)
}

async function handleUploadFile(file: File) {
  if (!props.documentId) {
    throw new Error('当前文档未初始化，无法上传附件')
  }

  return uploadDocumentFile(props.documentId, file)
}

const bodyEditorExtensions = createBodyExtensions({
  uploadImage: handleUploadImage,
  uploadFile: handleUploadFile,
})
const bodyEditorRef = useTemplateRef<TiptapEditorExposed>('bodyEditor')
const blockTriggerMenuRef = useTemplateRef<BlockTriggerMenuExposed>('blockTriggerMenu')
const bodyEditor = computed(() => bodyEditorRef.value?.editor ?? null)

const handleBodyEditorKeyDown: TiptapEditorHandleKeyDown = (_, event) => {
  const editor = bodyEditor.value

  if (!props.editable || event.key !== '/' || !editor || !isTriggerMenuSelection(editor)) {
    return false
  }

  const opened = blockTriggerMenuRef.value?.openMenu() ?? false

  if (!opened) {
    return false
  }

  event.preventDefault()
  return true
}
</script>

<template>
  <section class="document-body-editor">
    <BubbleToolbar
      v-if="bodyEditor && props.editable"
      :editor="bodyEditor"
      :upload-image="handleUploadImage"
    />

    <TiptapEditor
      ref="bodyEditor"
      class="document-body-editor__surface"
      :content="props.content"
      :extensions="bodyEditorExtensions"
      :editable="props.editable"
      :handle-key-down="handleBodyEditorKeyDown"
      @update:content="emits('update:content', $event)"
      @content-error="emits('contentError', $event)"
    />

    <BlockTriggerMenu
      v-if="bodyEditor && props.editable"
      ref="blockTriggerMenu"
      :editor="bodyEditor"
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
