import type { TiptapJsonContent } from '@haohaoxue/samepage-domain'
import type { JSONContent } from '@tiptap/core'
import type {
  ActiveDocumentDetail,
  DocumentEditorMeta,
} from '@/views/docs/typing'
import { DOCUMENT_PANE_STATE, TIPTAP_SCHEMA_VERSION } from '@haohaoxue/samepage-contracts'
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
    ownerId: 'user-1',
    parentId: null,
    latestSnapshotId: 'snapshot-1',
    order: 0,
    spaceScope: 'PERSONAL',
    status: 'ACTIVE',
    summary: '测试摘要',
    createdAt: '2026-04-13T00:00:00.000Z',
    updatedAt: '2026-04-13T00:00:00.000Z',
    headRevision: 1,
    schemaVersion: TIPTAP_SCHEMA_VERSION,
    title: createDocumentTitleContent('测试文档'),
    body: invalidContent as TiptapJsonContent,
    ...overrides,
  }
}

function createEditorMeta(overrides: Partial<DocumentEditorMeta> = {}): DocumentEditorMeta {
  return {
    user: {
      displayName: 'System Admin',
      avatarUrl: null,
      initial: 'S',
    },
    updatedLabel: '今天修改',
    createdLabel: '4月13日创建',
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
        metadata: createEditorMeta(),
        mode: 'default',
        isLoading: false,
        paneState: 'ready',
        hasFallbackDocument: false,
      },
      global: {
        stubs: {
          ElAvatar: defineComponent({
            template: '<span class="el-avatar-stub"><slot /></span>',
          }),
          ElDropdown: defineComponent({
            template: '<div class="el-dropdown-stub"><slot /><slot name="dropdown" /></div>',
          }),
          ElDropdownMenu: defineComponent({
            template: '<div class="el-dropdown-menu-stub"><slot /></div>',
          }),
          ElDropdownItem: defineComponent({
            template: '<button class="el-dropdown-item-stub"><slot /></button>',
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
      expect(wrapper.find('.document-editor__title').exists()).toBe(true)
      expect(wrapper.find('.document-editor__body').exists()).toBe(true)
    })

    expect(wrapper.find('input').exists()).toBe(false)
  })

  it('在编辑器内容非法时阻断编辑并显示降级提示', async () => {
    const wrapper = mount(DocumentEditorPane, {
      props: {
        document: createDocument(),
        metadata: createEditorMeta(),
        mode: 'default',
        isLoading: false,
        paneState: 'ready',
        hasFallbackDocument: false,
      },
      global: {
        stubs: {
          ElAvatar: defineComponent({
            template: '<span class="el-avatar-stub"><slot /></span>',
          }),
          ElDropdown: defineComponent({
            template: '<div class="el-dropdown-stub"><slot /><slot name="dropdown" /></div>',
          }),
          ElDropdownMenu: defineComponent({
            template: '<div class="el-dropdown-menu-stub"><slot /></div>',
          }),
          ElDropdownItem: defineComponent({
            template: '<button class="el-dropdown-item-stub"><slot /></button>',
          }),
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

  it('在 schema 不兼容时显示明确的阻断提示', () => {
    const wrapper = mount(DocumentEditorPane, {
      props: {
        document: null,
        metadata: null,
        mode: 'default',
        isLoading: false,
        paneState: DOCUMENT_PANE_STATE.UNSUPPORTED_SCHEMA,
        hasFallbackDocument: true,
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

    expect(wrapper.text()).toContain('文档 schema 版本不受支持')
    expect(wrapper.text()).toContain('打开可用文档')
  })
})
