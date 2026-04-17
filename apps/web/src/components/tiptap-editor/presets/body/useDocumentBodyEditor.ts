import type { Editor } from '@tiptap/core'
import type { ShallowRef, TemplateRef } from 'vue'
import type {
  TiptapEditorCommentRequest,
  TiptapEditorHandleKeyDown,
} from '../../core/typing'
import type { BlockTriggerMenuExposed } from '../../overlays/block-trigger/typing'
import type { DocumentBodyEditorProps } from './typing'
import { computed } from 'vue'
import {
  uploadDocumentFile,
  uploadDocumentImage,
} from '@/apis/document'
import { createBodyExtensions } from '../../extensions/createExtensions'
import { isTriggerMenuSelection } from './triggerSelection'

export function useDocumentBodyEditor(options: {
  blockTriggerMenuRef: TemplateRef<BlockTriggerMenuExposed | null>
  bodyEditor: ShallowRef<Editor | null>
  onRequestComment: (request: TiptapEditorCommentRequest) => void
  props: DocumentBodyEditorProps
}) {
  const bodyEditorExtensions = createBodyExtensions({
    uploadImage: handleUploadImage,
    uploadFile: handleUploadFile,
  })
  const bodyEditor = computed(() => options.bodyEditor.value)

  const handleBodyEditorKeyDown: TiptapEditorHandleKeyDown = (_, event) => {
    const editor = bodyEditor.value

    if (!options.props.editable || event.key !== '/' || !editor || !isTriggerMenuSelection(editor)) {
      return false
    }

    const opened = options.blockTriggerMenuRef.value?.openMenu() ?? false

    if (!opened) {
      return false
    }

    event.preventDefault()
    return true
  }

  function handleCommentRequest(request: TiptapEditorCommentRequest) {
    options.onRequestComment(request)
  }

  function handleBodyEditorChange(editor: Editor | null) {
    options.bodyEditor.value = editor
  }

  return {
    bodyEditor,
    bodyEditorExtensions,
    handleBodyEditorChange,
    handleBodyEditorKeyDown,
    handleCommentRequest,
    handleUploadFile,
    handleUploadImage,
  }

  async function handleUploadImage(file: File) {
    if (!options.props.documentId) {
      throw new Error('当前文档未初始化，无法上传图片')
    }

    return uploadDocumentImage(options.props.documentId, file)
  }

  async function handleUploadFile(file: File) {
    if (!options.props.documentId) {
      throw new Error('当前文档未初始化，无法上传附件')
    }

    return uploadDocumentFile(options.props.documentId, file)
  }
}
