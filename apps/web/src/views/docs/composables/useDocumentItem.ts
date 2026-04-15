import type { DocumentItemProps } from '../typing'
import { DOCUMENT_COLLECTION } from '@haohaoxue/samepage-contracts'
import { computed } from 'vue'

export function useDocumentItem(
  props: DocumentItemProps,
  options: {
    onDeleteDocument: (documentId: string) => void
    onOpen: (documentId: string) => void
    onToggle: (documentId: string) => void
  },
) {
  const isActive = computed(() => props.activeDocumentId === props.item.id)
  const isExpanded = computed(() => props.expandedDocumentIds.has(props.item.id))
  const canManageDocument = computed(() => props.collectionId === DOCUMENT_COLLECTION.PERSONAL)

  function openDocument() {
    options.onOpen(props.item.id)
  }

  function toggleItem() {
    if (!props.item.hasChildren) {
      return
    }

    options.onToggle(props.item.id)
  }

  function handleDeleteCommand() {
    options.onDeleteDocument(props.item.id)
  }

  function getItemStateClass() {
    return isActive.value ? 'active' : 'idle'
  }

  function getActionsStateClass() {
    return isActive.value ? 'visible' : 'hidden'
  }

  function getExpandIconName() {
    return isExpanded.value ? 'chevron-down' : 'chevron-right'
  }

  return {
    canManageDocument,
    getActionsStateClass,
    getExpandIconName,
    getItemStateClass,
    handleDeleteCommand,
    isExpanded,
    openDocument,
    toggleItem,
  }
}
