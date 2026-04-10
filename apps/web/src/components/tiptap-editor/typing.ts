import type { Editor } from '@tiptap/core'

export interface TiptapEditorProps {
  /**
   * 内容
   * @description 编辑器文本内容
   */
  content: string
}

export interface TiptapEditorEmits {
  'update:content': [content: string]
}

export interface BubbleToolbarProps {
  editor: Editor
}

export interface ColorPickerDropdownProps {
  editor: Editor
}

export interface TurnIntoDropdownProps {
  editor: Editor
}
