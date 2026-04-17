import type { TiptapJsonContent } from '@haohaoxue/samepage-domain'
import type { Editor, Extensions } from '@tiptap/core'
import type { EditorProps } from '@tiptap/pm/view'

export type TiptapEditorHandleKeyDown = NonNullable<EditorProps['handleKeyDown']>
export type TiptapEditorContent = TiptapJsonContent

export interface TiptapEditorProps {
  /**
   * 初始扩展
   * @description 仅在编辑器初始化时读取，运行时变更必须重建组件
   */
  initialExtensions: Extensions
  /**
   * 内容
   * @description 编辑器内容节点数组
   */
  content: TiptapEditorContent
  /**
   * 是否可编辑
   * @description 关闭后仅保留只读预览能力
   */
  editable?: boolean
  /**
   * 按键处理
   * @description 自定义键盘事件处理器
   */
  handleKeyDown?: TiptapEditorHandleKeyDown
}

export interface TiptapEditorEmits {
  'update:content': [content: TiptapEditorContent]
  'contentError': [error: Error]
  'editorChange': [editor: Editor | null]
}

/**
 * 评论触发来源。
 */
export type TiptapEditorCommentTriggerSource = 'bubble-toolbar' | 'block-menu'

/**
 * 评论触发请求。
 */
export interface TiptapEditorCommentRequest {
  /** 触发来源 */
  source: TiptapEditorCommentTriggerSource
}
