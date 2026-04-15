import type { DocumentTitleContent } from '@haohaoxue/samepage-domain'
import type { TiptapEditorContent } from '../typing'

export interface DocumentTitleEditorProps {
  /**
   * 标题
   * @description 文档标题轻量内容
   */
  title: DocumentTitleContent
}

export interface DocumentTitleEditorEmits {
  'update:title': [title: DocumentTitleContent]
}

export interface DocumentBodyEditorProps {
  /**
   * 正文
   * @description 正文内容节点数组
   */
  content: TiptapEditorContent
}

export interface DocumentBodyEditorEmits {
  'update:content': [content: TiptapEditorContent]
  'contentError': [error: Error]
}
