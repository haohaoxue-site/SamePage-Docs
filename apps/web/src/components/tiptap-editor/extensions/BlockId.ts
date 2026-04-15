import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import type { BodyBlockIdNodeType } from '../helpers/blockId'
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import {
  BODY_BLOCK_ID_ATTRIBUTE,
  BODY_BLOCK_ID_NODE_TYPES,

  createBlockId,
  isBlockId,
} from '../helpers/blockId'

const BLOCK_ID_TRANSACTION_META = 'samepageBlockIdTransaction'

/**
 * blockId 扩展配置。
 */
export interface BlockIdOptions {
  attributeName: string
  dataAttributeName: string
  types: string[]
  generateId: (nodeType: BodyBlockIdNodeType) => string
}

export const BlockId = Extension.create<BlockIdOptions>({
  name: 'blockId',

  addOptions() {
    return {
      attributeName: BODY_BLOCK_ID_ATTRIBUTE,
      dataAttributeName: 'data-block-id',
      types: [...BODY_BLOCK_ID_NODE_TYPES],
      generateId: createBlockId,
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          [this.options.attributeName]: {
            default: null,
            parseHTML: element => element.getAttribute(this.options.dataAttributeName),
            renderHTML: (attributes) => {
              const blockId = attributes[this.options.attributeName]

              if (typeof blockId !== 'string' || !blockId.length) {
                return {}
              }

              return {
                [this.options.dataAttributeName]: blockId,
              }
            },
          },
        },
      },
    ]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey(this.name),
        appendTransaction: (transactions, _, newState) => {
          if (!transactions.some(transaction => transaction.docChanged && !transaction.getMeta(BLOCK_ID_TRANSACTION_META))) {
            return
          }

          return createBlockIdTransaction(newState, this.options) ?? undefined
        },
      }),
    ]
  },

  onCreate() {
    const transaction = createBlockIdTransaction(this.editor.state, this.options)

    if (!transaction) {
      return
    }

    this.editor.view.dispatch(transaction)
  },
})

function createBlockIdTransaction(
  state: EditorState,
  options: BlockIdOptions,
): Transaction | null {
  const seenIds = new Set<string>()
  let transaction = state.tr
  let changed = false

  state.doc.descendants((node, pos) => {
    if (!shouldAssignBlockId(node, options.types)) {
      return
    }

    const blockId = readBlockId(node, options.attributeName)

    if (blockId && !seenIds.has(blockId)) {
      seenIds.add(blockId)
      return
    }

    const nextId = generateUniqueBlockId(node.type.name, seenIds, options.generateId)

    seenIds.add(nextId)
    transaction = transaction.setNodeMarkup(
      pos,
      undefined,
      {
        ...node.attrs,
        [options.attributeName]: nextId,
      },
      node.marks,
    )
    changed = true
  })

  if (!changed) {
    return null
  }

  return transaction.setMeta(BLOCK_ID_TRANSACTION_META, true)
}

function shouldAssignBlockId(node: ProseMirrorNode, types: string[]): node is ProseMirrorNode & { type: { name: BodyBlockIdNodeType } } {
  return node.type.name !== 'doc' && node.isBlock && types.includes(node.type.name)
}

function readBlockId(node: ProseMirrorNode, attributeName: string) {
  const blockId = node.attrs[attributeName]

  if (!isBlockId(blockId)) {
    return null
  }

  return blockId
}

function generateUniqueBlockId(
  nodeType: BodyBlockIdNodeType,
  seenIds: Set<string>,
  generateId: (nodeType: BodyBlockIdNodeType) => string,
) {
  let blockId = generateId(nodeType)

  while (!blockId || seenIds.has(blockId)) {
    blockId = generateId(nodeType)
  }

  return blockId
}
