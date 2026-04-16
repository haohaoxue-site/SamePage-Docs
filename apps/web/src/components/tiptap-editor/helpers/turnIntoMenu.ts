import type { TurnIntoBlockType } from '@haohaoxue/samepage-domain'
import type { Editor } from '@tiptap/core'
import { isTurnIntoBlockActive } from '../extensions/BlockCommands'

/** 块转换菜单项 */
export interface TurnIntoMenuItem {
  label: string
  icon: string
  target: TurnIntoBlockType
  isActive: boolean
}

const turnIntoMenuDefinitions = [
  {
    label: '正文',
    icon: 'T',
    target: 'paragraph',
  },
  {
    label: '标题 1',
    icon: 'H1',
    target: 'heading-1',
  },
  {
    label: '标题 2',
    icon: 'H2',
    target: 'heading-2',
  },
  {
    label: '标题 3',
    icon: 'H3',
    target: 'heading-3',
  },
  {
    label: '无序列表',
    icon: 'list-ul',
    target: 'bulletList',
  },
  {
    label: '有序列表',
    icon: 'list-ol',
    target: 'orderedList',
  },
  {
    label: '代码块',
    icon: 'code',
    target: 'codeBlock',
  },
  {
    label: '引用',
    icon: 'quote',
    target: 'blockquote',
  },
  {
    label: '分割线',
    icon: 'divider',
    target: 'divider',
  },
  {
    label: '任务列表',
    icon: 'task',
    target: 'taskList',
  },
] satisfies Array<Omit<TurnIntoMenuItem, 'isActive'>>

export function getTurnIntoMenuItems(editor: Editor): TurnIntoMenuItem[] {
  return turnIntoMenuDefinitions.map(item => ({
    ...item,
    isActive: isTurnIntoBlockActive(editor, item.target),
  }))
}
