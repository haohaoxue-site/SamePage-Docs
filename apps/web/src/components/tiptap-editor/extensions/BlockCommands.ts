import type { TurnIntoBlockType } from '@haohaoxue/samepage-domain'
import type { CommandProps, Editor } from '@tiptap/core'
import type { CurrentBlockSelection } from '../helpers/currentBlock'
import { Extension } from '@tiptap/core'
import { Selection } from '@tiptap/pm/state'
import { getCurrentBlock } from '../helpers/currentBlock'

type HeadingTurnIntoBlockType = Extract<TurnIntoBlockType, 'heading-1' | 'heading-2' | 'heading-3'>
type BlockCommandContext = Pick<CommandProps, 'commands' | 'editor'>

const HEADING_LEVEL_BY_TARGET: Record<HeadingTurnIntoBlockType, 1 | 2 | 3> = {
  'heading-1': 1,
  'heading-2': 2,
  'heading-3': 3,
}

export const BlockCommands = Extension.create({
  name: 'BlockCommands',

  addCommands() {
    return {
      turnIntoBlock: target => (props) => {
        switch (target) {
          case 'paragraph':
            return turnIntoParagraph(props)
          case 'heading-1':
          case 'heading-2':
          case 'heading-3':
            return turnIntoHeading(props, HEADING_LEVEL_BY_TARGET[target])
          case 'bulletList':
            return turnIntoBulletList(props)
          case 'orderedList':
            return turnIntoOrderedList(props)
          case 'codeBlock':
            return turnIntoCodeBlock(props)
          case 'blockquote':
            return turnIntoBlockquote(props)
          case 'divider':
            return turnIntoDivider(props)
          case 'taskList':
            return turnIntoTaskList(props)
        }
      },
      indentBlock: () => (props) => {
        const listItemType = getActiveListItemType(props.editor)

        if (!listItemType) {
          return false
        }

        return props.commands.sinkListItem(listItemType)
      },
      outdentBlock: () => (props) => {
        const listItemType = getActiveListItemType(props.editor)

        if (!listItemType) {
          return false
        }

        return props.commands.liftListItem(listItemType)
      },
      moveBlockUp: () => (props: CommandProps) => moveCurrentBlock(props, 'up'),
      moveBlockDown: () => (props: CommandProps) => moveCurrentBlock(props, 'down'),
      insertBlock: () => (props: CommandProps) => insertBlockAfterCurrent(props),
      deleteBlock: () => (props: CommandProps) => deleteCurrentBlock(props),
      duplicateBlock: () => (props: CommandProps) => duplicateCurrentBlock(props),
    }
  },
})

export function isTurnIntoBlockActive(editor: Editor, target: TurnIntoBlockType) {
  switch (target) {
    case 'paragraph':
      return isPlainParagraphActive(editor)
    case 'heading-1':
    case 'heading-2':
    case 'heading-3':
      return editor.isActive('heading', {
        level: HEADING_LEVEL_BY_TARGET[target],
      })
    case 'bulletList':
      return editor.isActive('bulletList')
    case 'orderedList':
      return editor.isActive('orderedList')
    case 'codeBlock':
      return editor.isActive('codeBlock')
    case 'blockquote':
      return editor.isActive('blockquote')
    case 'divider':
      return editor.isActive('horizontalRule')
    case 'taskList':
      return editor.isActive('taskList')
  }
}

function turnIntoParagraph(props: BlockCommandContext) {
  if (isTurnIntoBlockActive(props.editor, 'paragraph')) {
    return true
  }

  return props.commands.clearNodes()
}

function turnIntoHeading(props: BlockCommandContext, level: 1 | 2 | 3) {
  if (props.editor.isActive('heading', { level })) {
    return true
  }

  ensureParagraphBase(props)
  return props.commands.setNode('heading', { level })
}

function turnIntoBulletList(props: BlockCommandContext) {
  if (props.editor.isActive('bulletList')) {
    return true
  }

  ensureParagraphBase(props)
  return props.commands.toggleBulletList()
}

function turnIntoOrderedList(props: BlockCommandContext) {
  if (props.editor.isActive('orderedList')) {
    return true
  }

  ensureParagraphBase(props)
  return props.commands.toggleOrderedList()
}

function turnIntoCodeBlock(props: BlockCommandContext) {
  if (props.editor.isActive('codeBlock')) {
    return true
  }

  ensureParagraphBase(props)
  return props.commands.toggleCodeBlock()
}

function turnIntoBlockquote(props: BlockCommandContext) {
  if (props.editor.isActive('blockquote')) {
    return true
  }

  ensureParagraphBase(props)
  return props.commands.toggleBlockquote()
}

function turnIntoDivider(props: BlockCommandContext) {
  if (props.editor.isActive('horizontalRule')) {
    return true
  }

  ensureParagraphBase(props)
  return props.commands.setHorizontalRule()
}

function turnIntoTaskList(props: BlockCommandContext) {
  if (props.editor.isActive('taskList')) {
    return true
  }

  ensureParagraphBase(props)
  return props.commands.toggleTaskList()
}

function ensureParagraphBase(props: BlockCommandContext) {
  if (isPlainParagraphActive(props.editor)) {
    return true
  }

  return props.commands.clearNodes()
}

function isPlainParagraphActive(editor: Editor) {
  return editor.isActive('paragraph')
    && !editor.isActive('heading')
    && !editor.isActive('bulletList')
    && !editor.isActive('orderedList')
    && !editor.isActive('taskList')
    && !editor.isActive('codeBlock')
    && !editor.isActive('blockquote')
}

function getActiveListItemType(editor: Editor) {
  if (editor.isActive('taskItem')) {
    return 'taskItem'
  }

  if (editor.isActive('listItem')) {
    return 'listItem'
  }

  return null
}

function duplicateCurrentBlock(props: CommandProps) {
  const currentBlock = getCurrentBlock(props.tr.selection)

  if (!currentBlock) {
    return false
  }

  props.tr.insert(currentBlock.to, currentBlock.node.copy(currentBlock.node.content))
  return true
}

function moveCurrentBlock(props: CommandProps, direction: 'up' | 'down') {
  const currentBlock = getCurrentBlock(props.tr.selection)

  if (!currentBlock) {
    return false
  }

  const targetPosition = getMoveTargetPosition(currentBlock, direction)

  if (targetPosition === null) {
    return false
  }

  props.tr.delete(currentBlock.from, currentBlock.to)
  props.tr.insert(targetPosition, currentBlock.node)
  setSelectionNearMovedBlock(props, targetPosition)

  return true
}

function insertBlockAfterCurrent(props: CommandProps) {
  const currentBlock = getCurrentBlock(props.tr.selection)

  if (!currentBlock) {
    return false
  }

  const insertedBlock = createInsertedBlock(props.editor, currentBlock.node.type.name)

  if (!insertedBlock) {
    return false
  }

  props.tr.insert(currentBlock.to, insertedBlock)
  setSelectionNearMovedBlock(props, currentBlock.to)

  return true
}

function deleteCurrentBlock(props: CommandProps) {
  const currentBlock = getCurrentBlock(props.tr.selection)

  if (!currentBlock) {
    return false
  }

  props.tr.delete(currentBlock.from, currentBlock.to)
  return true
}

function createInsertedBlock(editor: Editor, currentBlockType: string) {
  if (currentBlockType === 'listItem' || currentBlockType === 'taskItem') {
    return editor.schema.nodes[currentBlockType]?.createAndFill()
  }

  return editor.schema.nodes.paragraph?.createAndFill()
}

function getMoveTargetPosition(
  currentBlock: CurrentBlockSelection,
  direction: 'up' | 'down',
) {
  if (direction === 'up') {
    if (currentBlock.index <= 0) {
      return null
    }

    return currentBlock.from - currentBlock.parent.child(currentBlock.index - 1).nodeSize
  }

  if (currentBlock.index >= currentBlock.parent.childCount - 1) {
    return null
  }

  return currentBlock.from + currentBlock.parent.child(currentBlock.index + 1).nodeSize
}

function setSelectionNearMovedBlock(props: CommandProps, blockStartPosition: number) {
  const selection = Selection.findFrom(
    props.tr.doc.resolve(blockStartPosition + 1),
    1,
    true,
  )

  if (!selection) {
    return
  }

  props.tr.setSelection(selection)
}
