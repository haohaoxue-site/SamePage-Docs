import type { TiptapJsonContent } from '@haohaoxue/samepage-domain'
import type { Editor, Extensions } from '@tiptap/core'
import type { EditorProps } from '@tiptap/pm/view'
import type { DocumentAsset } from '@/apis/document'

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
}

/** 编辑器实例暴露 */
export interface TiptapEditorExposed {
  editor: Editor | null
}

/**
 * 已上传图片资源。
 */
export interface TiptapEditorUploadedImage extends DocumentAsset {}

/**
 * 已上传附件资源。
 */
export interface TiptapEditorUploadedFile extends DocumentAsset {}

export interface BubbleToolbarProps {
  editor: Editor
  /**
   * 图片上传
   * @description 上传成功后返回可插入的图片资源
   */
  uploadImage?: (file: File) => Promise<TiptapEditorUploadedImage>
}

export interface ColorPickerDropdownProps {
  editor: Editor
}

export interface TurnIntoDropdownProps {
  editor: Editor
}
