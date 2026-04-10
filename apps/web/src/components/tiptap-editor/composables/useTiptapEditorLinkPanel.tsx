import type { Editor } from '@tiptap/core'
import { ElButton, ElInput } from 'element-plus'
import { defineComponent, nextTick, shallowRef } from 'vue'

type EditorResolver = () => Editor | null | undefined

interface EditorSelectionRange {
  /** 选区起点 */
  from: number
  /** 选区终点 */
  to: number
}

export function useTiptapEditorLinkPanel(getEditor: EditorResolver) {
  const isOpen = shallowRef(false)
  const canRemove = shallowRef(false)
  const linkUrl = shallowRef('https://')
  const selectionRange = shallowRef<EditorSelectionRange | null>(null)
  const linkInputRef = shallowRef<{ focus: () => void } | null>(null)

  function getEditorInstance() {
    return getEditor()
  }

  function rememberSelection(editor: Editor) {
    const { from, to } = editor.state.selection
    selectionRange.value = { from, to }
  }

  function getLinkChain(editor: Editor) {
    const chain = editor.chain().focus()

    if (selectionRange.value) {
      chain.setTextSelection(selectionRange.value)
    }

    return chain.extendMarkRange('link')
  }

  function finalizeClose() {
    isOpen.value = false
    canRemove.value = false
    selectionRange.value = null
  }

  function open() {
    const editor = getEditorInstance()

    if (!editor) {
      return
    }

    const href = editor.getAttributes('link').href

    linkUrl.value = typeof href === 'string' && href ? href : 'https://'
    canRemove.value = editor.isActive('link') || Boolean(href)
    rememberSelection(editor)
    isOpen.value = true

    void nextTick(() => {
      linkInputRef.value?.focus()
    })
  }

  function cancel() {
    const editor = getEditorInstance()

    if (editor) {
      getLinkChain(editor).run()
    }

    finalizeClose()
  }

  function toggle() {
    if (isOpen.value) {
      cancel()
      return
    }

    open()
  }

  function apply() {
    const editor = getEditorInstance()

    if (!editor) {
      return
    }

    const href = linkUrl.value.trim()
    const chain = getLinkChain(editor)

    if (href) {
      chain.setLink({ href }).run()
    }
    else {
      chain.unsetLink().run()
    }

    finalizeClose()
  }

  function remove() {
    const editor = getEditorInstance()

    if (!editor) {
      return
    }

    getLinkChain(editor).unsetLink().run()
    finalizeClose()
  }

  function handleInputKeydown(event: Event | KeyboardEvent) {
    if (!(event instanceof KeyboardEvent)) {
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      apply()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
    }
  }

  const LinkPanel = defineComponent({
    name: 'TiptapEditorLinkPanel',
    setup() {
      return () => {
        if (!isOpen.value) {
          return null
        }

        return (
          <div
            class="min-w-[18rem] flex flex-wrap items-center gap-2 rounded-3 border border-border bg-surface-raised p-3 shadow-[var(--brand-shadow-floating)]"
            onMousedown={event => event.stopPropagation()}
          >
            <ElInput
              ref={linkInputRef}
              modelValue={linkUrl.value}
              class="min-w-[14rem] flex-1"
              placeholder="输入或粘贴链接..."
              onKeydown={handleInputKeydown}
              onUpdate:modelValue={(value: string) => {
                linkUrl.value = value
              }}
            />
            <div class="ml-auto flex items-center gap-1.5">
              <ElButton
                size="small"
                type="primary"
                onClick={apply}
              >
                确认
              </ElButton>
              {canRemove.value
                ? (
                    <ElButton
                      size="small"
                      onClick={remove}
                    >
                      移除
                    </ElButton>
                  )
                : null}
              <ElButton
                size="small"
                onClick={cancel}
              >
                取消
              </ElButton>
            </div>
          </div>
        )
      }
    },
  })

  return {
    isOpen,
    toggle,
    LinkPanel,
  }
}
