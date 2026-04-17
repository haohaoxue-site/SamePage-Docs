import type { Editor } from '@tiptap/core'
import type { VueWrapper } from '@vue/test-utils'
import { expect, vi } from 'vitest'
import TiptapEditor from '@/components/tiptap-editor/core/TiptapEditor.vue'

function getLatestEditorChange(wrapper: VueWrapper) {
  const payloads = wrapper.emitted('editorChange') ?? []

  return payloads
    .map(([editor]) => editor as Editor | null)
    .filter((editor): editor is Editor => Boolean(editor))
    .at(-1)
}

export async function waitForMountedEditor(wrapper: VueWrapper) {
  await vi.waitFor(() => {
    expect(getLatestEditorChange(wrapper)).toBeTruthy()
  })

  return getLatestEditorChange(wrapper)!
}

export async function waitForNestedEditor(wrapper: VueWrapper) {
  return waitForMountedEditor(wrapper.findComponent(TiptapEditor))
}
