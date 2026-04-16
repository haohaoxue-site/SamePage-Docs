import type { TiptapJsonContent } from '@haohaoxue/samepage-domain'
import type { TiptapEditorContent } from '../typing'

export interface DocumentTitleEditorProps {
  /**
   * 标题
   * @description 文档标题轻量内容
   */
  title: TiptapJsonContent
  /**
   * 是否可编辑
   * @description 历史预览时关闭编辑能力
   */
  editable?: boolean
}

export interface DocumentTitleEditorEmits {
  'update:title': [title: TiptapJsonContent]
}

export interface DocumentBodyEditorProps {
  /**
   * 文档 ID
   * @description 用于图片上传与资源解析
   */
  documentId?: string | null
  /**
   * 正文
   * @description 正文内容节点数组
   */
  content: TiptapEditorContent
  /**
   * 是否可编辑
   * @description 历史预览时关闭编辑能力
   */
  editable?: boolean
}

export interface DocumentBodyEditorEmits {
  'update:content': [content: TiptapEditorContent]
  'contentError': [error: Error]
}
