import type { TiptapJsonContent, TiptapJsonNode } from '@haohaoxue/samepage-domain'
import { TIPTAP_BLOCK_ID_PREFIX } from '@haohaoxue/samepage-contracts'
import { customAlphabet } from 'nanoid'

const BLOCK_ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'
const BLOCK_ID_SIZE = 12
const BLOCK_ID_PATTERN = new RegExp(`^${TIPTAP_BLOCK_ID_PREFIX}[0-9a-z]{${BLOCK_ID_SIZE}}$`)

export const BODY_BLOCK_ID_ATTRIBUTE = 'id' as const

export const BODY_BLOCK_ID_NODE_TYPES = [
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'taskList',
  'taskItem',
  'blockquote',
  'codeBlock',
  'horizontalRule',
] as const

export type BodyBlockIdNodeType = (typeof BODY_BLOCK_ID_NODE_TYPES)[number]

const BODY_BLOCK_ID_NODE_TYPE_SET = new Set<string>(BODY_BLOCK_ID_NODE_TYPES)
const createBlockIdSuffix = customAlphabet(BLOCK_ID_ALPHABET, BLOCK_ID_SIZE)

export function createBlockId(_nodeType: BodyBlockIdNodeType) {
  return `${TIPTAP_BLOCK_ID_PREFIX}${createBlockIdSuffix()}`
}

export function normalizeBlockIds(content: TiptapJsonContent): TiptapJsonContent {
  const seenIds = new Set<string>()

  return content.map(node => normalizeContentNode(node, seenIds))
}

export function isBlockId(value: unknown): value is string {
  return typeof value === 'string' && BLOCK_ID_PATTERN.test(value)
}

function normalizeContentNode(
  content: TiptapJsonNode,
  seenIds: Set<string>,
): TiptapJsonNode {
  const normalizedChildren = Array.isArray(content.content)
    ? content.content.map(child => normalizeContentNode(child, seenIds))
    : undefined

  let nextContent: TiptapJsonNode = normalizedChildren
    ? {
        ...content,
        content: normalizedChildren,
      }
    : { ...content }

  if (!shouldAssignBlockId(nextContent)) {
    return nextContent
  }

  const blockId = readValidBlockId(nextContent)

  if (blockId && !seenIds.has(blockId)) {
    seenIds.add(blockId)
    return nextContent
  }

  const nextBlockId = createUniqueBlockId(nextContent.type, seenIds)

  seenIds.add(nextBlockId)
  nextContent = {
    ...nextContent,
    attrs: {
      ...nextContent.attrs,
      [BODY_BLOCK_ID_ATTRIBUTE]: nextBlockId,
    },
  }

  return nextContent
}

function shouldAssignBlockId(content: TiptapJsonNode): content is TiptapJsonNode & { type: BodyBlockIdNodeType } {
  return typeof content.type === 'string' && BODY_BLOCK_ID_NODE_TYPE_SET.has(content.type)
}

function readValidBlockId(content: TiptapJsonNode) {
  return isBlockId(content.attrs?.[BODY_BLOCK_ID_ATTRIBUTE])
    ? content.attrs?.[BODY_BLOCK_ID_ATTRIBUTE]
    : null
}

function createUniqueBlockId(_nodeType: BodyBlockIdNodeType, seenIds: Set<string>) {
  let blockId = createBlockId(_nodeType)

  while (seenIds.has(blockId)) {
    blockId = createBlockId(_nodeType)
  }

  return blockId
}
