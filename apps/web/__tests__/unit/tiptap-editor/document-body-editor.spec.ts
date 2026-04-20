import type { Editor } from '@tiptap/core'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import DocumentBodyEditor from '@/components/tiptap-editor/presets/body/DocumentBodyEditor.vue'

describe('documentBodyEditor', () => {
  it('activeBlockId 变化后会把目标块滚动到可视区域', async () => {
    const scrollIntoView = vi.fn()
    const editorRoot = document.createElement('div')
    const targetBlock = document.createElement('div')
    targetBlock.dataset.blockId = 'block_target'
    targetBlock.scrollIntoView = scrollIntoView
    editorRoot.appendChild(targetBlock)

    const editor = {
      view: {
        dom: editorRoot,
      },
    } as unknown as Editor

    const wrapper = mount(DocumentBodyEditor, {
      props: {
        documentId: 'doc-1',
        content: [],
        editable: true,
        activeBlockId: 'block_target',
      },
      global: {
        stubs: {
          BubbleToolbar: defineComponent({
            template: '<div class="bubble-toolbar-stub" />',
          }),
          BlockTriggerMenu: defineComponent({
            template: '<div class="block-trigger-menu-stub" />',
          }),
          EditorOutline: defineComponent({
            template: '<div class="editor-outline-stub" />',
          }),
          TiptapEditor: defineComponent({
            emits: ['editorChange'],
            mounted() {
              this.$emit('editorChange', editor)
            },
            template: '<div class="tiptap-editor-stub" />',
          }),
        },
      },
    })

    await vi.waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      })
    })

    await wrapper.setProps({
      activeBlockId: null,
    })

    expect(scrollIntoView).toHaveBeenCalledTimes(1)
  })

  it('同一个 activeBlockId 下正文内容更新时不会重复滚动', async () => {
    const scrollIntoView = vi.fn()
    const editorRoot = document.createElement('div')
    const targetBlock = document.createElement('div')
    targetBlock.dataset.blockId = 'block_target'
    targetBlock.scrollIntoView = scrollIntoView
    editorRoot.appendChild(targetBlock)

    const editor = {
      view: {
        dom: editorRoot,
      },
    } as unknown as Editor

    const wrapper = mount(DocumentBodyEditor, {
      props: {
        documentId: 'doc-1',
        content: [],
        editable: true,
        activeBlockId: 'block_target',
      },
      global: {
        stubs: {
          BubbleToolbar: defineComponent({
            template: '<div class="bubble-toolbar-stub" />',
          }),
          BlockTriggerMenu: defineComponent({
            template: '<div class="block-trigger-menu-stub" />',
          }),
          EditorOutline: defineComponent({
            template: '<div class="editor-outline-stub" />',
          }),
          TiptapEditor: defineComponent({
            emits: ['editorChange'],
            mounted() {
              this.$emit('editorChange', editor)
            },
            template: '<div class="tiptap-editor-stub" />',
          }),
        },
      },
    })

    await vi.waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledTimes(1)
    })

    await wrapper.setProps({
      content: [
        {
          type: 'paragraph',
          attrs: {
            id: 'block_target',
          },
          content: [{ type: 'text', text: '正文更新后不应重复滚动' }],
        },
      ],
    })
    await nextTick()

    expect(scrollIntoView).toHaveBeenCalledTimes(1)
  })
})
