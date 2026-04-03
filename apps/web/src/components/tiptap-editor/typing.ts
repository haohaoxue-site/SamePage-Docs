import type { Editor } from '@tiptap/vue-3'

/** Tiptap 编辑器输入属性 */
export interface TiptapEditorProps {
  content: string
}

/** Tiptap 编辑器事件 */
export interface TiptapEditorEmits {
  'update:content': [content: string]
}

/** Tiptap 气泡工具栏属性 */
export interface BubbleToolbarProps {
  editor: Editor
}

/** Tiptap 颜色选择下拉属性 */
export interface ColorPickerDropdownProps {
  editor: Editor
}

/** Tiptap 样式切换下拉属性 */
export interface TurnIntoDropdownProps {
  editor: Editor
}

/** Tiptap 链接面板事件 */
export interface EditorLinkPanelEmits {
  apply: []
  cancel: []
}
