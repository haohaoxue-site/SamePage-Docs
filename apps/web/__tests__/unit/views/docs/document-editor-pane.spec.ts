import type { TiptapJsonContent } from '@haohaoxue/samepage-domain'
import type { JSONContent } from '@tiptap/core'
import type { ActiveDocumentDetail } from '@/views/docs/typing'
import { TIPTAP_SCHEMA_VERSION } from '@haohaoxue/samepage-contracts'
import { createDocumentTitleContent } from '@haohaoxue/samepage-shared'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import DocumentEditorPane from '@/views/docs/components/DocumentEditorPane.vue'

const invalidContent = [
  {
    type: 'unknown-block',
  },
] satisfies JSONContent[]

const validContent = [
  {
    type: 'paragraph',
    content: [{ type: 'text', text: '正文内容' }],
  },
] satisfies JSONContent[]

function createDocument(overrides: Partial<ActiveDocumentDetail> = {}): ActiveDocumentDetail {
  return {
    id: 'doc-1',
    title: createDocumentTitleContent('测试文档'),
    summary: '测试摘要',
    createdAt: '2026-04-13T00:00:00.000Z',
    createdBy: null,
    updatedAt: '2026-04-13T00:00:00.000Z',
    updatedBy: null,
    parentId: null,
    schemaVersion: TIPTAP_SCHEMA_VERSION,
    body: invalidContent as TiptapJsonContent,
    hasChildren: false,
    hasContent: true,
    scope: 'PERSONAL',
    collection: 'personal',
    ...overrides,
  }
}

describe('documentEditorPane', () => {
  it('在可编辑状态下渲染双编辑区外壳', async () => {
    const wrapper = mount(DocumentEditorPane, {
      props: {
        document: createDocument({
          body: validContent as TiptapJsonContent,
        }),
        isLoading: false,
        paneState: 'ready',
        hasFallbackDocument: false,
      },
      global: {
        stubs: {
          ElEmpty: defineComponent({
            template: '<div class="el-empty-stub"><slot name="image" /><slot name="description" /><slot /></div>',
          }),
          ElButton: defineComponent({
            template: '<button><slot /></button>',
          }),
          SvgIcon: defineComponent({
            template: '<span class="svg-icon-stub" />',
          }),
        },
      },
    })

    await vi.waitFor(() => {
      expect(wrapper.find('.document-editor__title').exists()).toBe(true)
      expect(wrapper.find('.document-editor__body').exists()).toBe(true)
    })

    expect(wrapper.find('input').exists()).toBe(false)
  })

  it('在编辑器内容非法时阻断编辑并显示降级提示', async () => {
    const wrapper = mount(DocumentEditorPane, {
      props: {
        document: createDocument(),
        isLoading: false,
        paneState: 'ready',
        hasFallbackDocument: false,
      },
      global: {
        stubs: {
          ElInput: defineComponent({
            props: {
              modelValue: {
                type: String,
                required: false,
              },
            },
            template: '<input :value="modelValue">',
          }),
          ElEmpty: defineComponent({
            template: '<div class="el-empty-stub"><slot name="image" /><slot name="description" /><slot /></div>',
          }),
          ElButton: defineComponent({
            template: '<button><slot /></button>',
          }),
          SvgIcon: defineComponent({
            template: '<span class="svg-icon-stub" />',
          }),
        },
      },
    })

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('文档内容暂时无法打开')
    })

    expect(wrapper.find('.document-editor-pane__editor').exists()).toBe(false)
    expect(wrapper.text()).toContain('重新加载')
  })
})
