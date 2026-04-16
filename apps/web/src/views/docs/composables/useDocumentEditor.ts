import type { DocumentEditorProps } from '../typing'
import { computed } from 'vue'

export function useDocumentEditor(props: DocumentEditorProps) {
  const isHistoryMode = computed(() => props.mode === 'history')

  return {
    isHistoryMode,
  }
}
