import type { Extensions } from '@tiptap/core'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import { TextStyle } from '@tiptap/extension-text-style'
import StarterKit from '@tiptap/starter-kit'
import { BlockCommands } from '../extensions/BlockCommands'
import { BlockId } from '../extensions/BlockId'
import { ResetMarksOnPlainEnter } from '../extensions/ResetMarksOnPlainEnter'

const BODY_PLACEHOLDER = '输入 / 唤起命令，或者直接开始写作。'
const TITLE_PLACEHOLDER = '输入文档标题'

export function createBodyExtensions(): Extensions {
  return [
    BlockId,
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
      link: {
        openOnClick: false,
      },
    }),
    Placeholder.configure({
      placeholder: BODY_PLACEHOLDER,
    }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    Image.configure({
      inline: true,
    }),
    BlockCommands,
    ResetMarksOnPlainEnter,
  ]
}

export function createTitleExtensions(): Extensions {
  return [
    StarterKit.configure({
      blockquote: false,
      bulletList: false,
      code: false,
      codeBlock: false,
      hardBreak: false,
      heading: false,
      horizontalRule: false,
      listItem: false,
      orderedList: false,
      strike: false,
    }),
    Placeholder.configure({
      placeholder: TITLE_PLACEHOLDER,
    }),
  ]
}
