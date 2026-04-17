import type { TiptapJsonContent } from '@haohaoxue/samepage-domain'

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
