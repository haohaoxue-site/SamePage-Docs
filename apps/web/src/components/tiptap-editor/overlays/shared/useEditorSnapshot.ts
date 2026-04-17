import type { Editor } from '@tiptap/core'
import { onBeforeUnmount, onMounted, shallowRef } from 'vue'

type EditorSnapshotEvent = 'selectionUpdate' | 'transaction' | 'focus' | 'blur'

const DEFAULT_EDITOR_SNAPSHOT_EVENTS = [
  'selectionUpdate',
  'transaction',
  'focus',
  'blur',
] as const satisfies readonly EditorSnapshotEvent[]

export function useEditorSnapshot(
  editor: Editor,
  events: readonly EditorSnapshotEvent[] = DEFAULT_EDITOR_SNAPSHOT_EVENTS,
) {
  const version = shallowRef(0)

  function syncSnapshot() {
    version.value += 1
  }

  onMounted(() => {
    if (typeof editor.on !== 'function') {
      return
    }

    events.forEach(event => editor.on(event, syncSnapshot))
  })

  onBeforeUnmount(() => {
    if (typeof editor.off !== 'function') {
      return
    }

    events.forEach(event => editor.off(event, syncSnapshot))
  })

  return version
}
