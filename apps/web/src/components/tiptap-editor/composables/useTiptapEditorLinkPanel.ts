import type { Editor } from '@tiptap/vue-3'
import { ref } from 'vue'

export function useTiptapEditorLinkPanel() {
  const isOpen = ref(false)
  const linkUrl = ref('https://')

  function open() {
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  function apply(editor: Editor | null | undefined) {
    if (!editor) {
      return
    }

    const href = linkUrl.value.trim()

    if (!href) {
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
    isOpen.value = false
  }

  return {
    isOpen,
    linkUrl,
    open,
    close,
    apply,
  }
}
