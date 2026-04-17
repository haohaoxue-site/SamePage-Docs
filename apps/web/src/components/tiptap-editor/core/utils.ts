import type {
  TiptapJsonContent,
  TiptapJsonNode,
} from '@haohaoxue/samepage-domain'
import type { TiptapEditorContent } from './typing'
import {
  createDocumentTitleContent,
  getDocumentPlainText,
  getDocumentTitlePlainText,
} from '@haohaoxue/samepage-shared'

export function unwrapTiptapContent(content: TiptapJsonNode): TiptapEditorContent {
  if (!Array.isArray(content.content) || !content.content.length) {
    return []
  }

  const normalizedContent = normalizeTiptapContent(content.content)

  return isEmptyParagraphContent(normalizedContent) ? [] : normalizedContent
}

export function wrapTiptapContent(content: TiptapEditorContent): TiptapJsonNode {
  return {
    type: 'doc',
    content: content.length ? content : createEmptyTiptapContent(),
  }
}

export function toTitleEditorContent(content: TiptapJsonContent): TiptapEditorContent {
  const title = getDocumentTitlePlainText(content)

  if (!title) {
    return createEmptyTiptapContent()
  }

  return [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: title }],
    },
  ]
}

export function fromTitleEditorContent(content: TiptapEditorContent): TiptapJsonContent {
  return createDocumentTitleContent(getDocumentPlainText(content))
}

function createEmptyTiptapContent(): TiptapEditorContent {
  return [{ type: 'paragraph' }]
}

function isEmptyParagraphContent(content: TiptapJsonContent) {
  if (content.length !== 1) {
    return false
  }

  return isEmptyParagraphNode(content[0])
}

function isEmptyParagraphNode(node: TiptapJsonNode | undefined) {
  if (!node || node.type !== 'paragraph') {
    return false
  }

  if (!Array.isArray(node.content) || node.content.length === 0) {
    return true
  }

  return node.content.every(child =>
    child?.type === 'text' && typeof child.text === 'string' && child.text.length === 0,
  )
}

function normalizeTiptapContent(content: TiptapJsonContent): TiptapJsonContent {
  const normalizedContent = JSON.parse(JSON.stringify(content)) as TiptapJsonContent

  if (shouldTrimTrailingEmptyParagraph(normalizedContent)) {
    normalizedContent.pop()
  }

  return normalizedContent
}

function shouldTrimTrailingEmptyParagraph(content: TiptapJsonContent) {
  if (content.length < 2) {
    return false
  }

  const lastNode = content.at(-1)
  const previousNode = content.at(-2)

  if (!isEmptyParagraphNode(lastNode) || !previousNode) {
    return false
  }

  return previousNode.type === 'paragraph'
    || previousNode.type === 'heading'
    || previousNode.type === 'blockquote'
    || previousNode.type === 'codeBlock'
}
