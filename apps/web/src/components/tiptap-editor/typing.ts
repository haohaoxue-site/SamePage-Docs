import type { TiptapJsonContent } from '@haohaoxue/samepage-domain'
import type { Editor, Extensions } from '@tiptap/core'
import type { EditorProps } from '@tiptap/pm/view'

export type TiptapEditorHandleKeyDown = NonNullable<EditorProps['handleKeyDown']>
export type TiptapEditorContent = TiptapJsonContent

export interface TiptapEditorProps {
  /**
   * 内容
   * @description 编辑器内容节点数组
   */
  content: TiptapEditorContent
  /**
   * 扩展
   * @description 当前编辑器注册的扩展集合
   */
  extensions: Extensions
  /**
   * 工具栏
   * @description 是否显示气泡工具栏
   */
  showBubbleToolbar?: boolean
  /**
   * 按键处理
   * @description 自定义键盘事件处理器
   */
  handleKeyDown?: TiptapEditorHandleKeyDown
}

export interface TiptapEditorEmits {
  'update:content': [content: TiptapEditorContent]
  'contentError': [error: Error]
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
