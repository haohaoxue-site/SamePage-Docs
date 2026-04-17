import type { TiptapJsonContent } from '@haohaoxue/samepage-domain'
import type { ActiveDocumentDetail } from '@/views/docs/typing'
import { TIPTAP_SCHEMA_VERSION } from '@haohaoxue/samepage-contracts'
import { createDocumentTitleContent } from '@haohaoxue/samepage-shared'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import DocumentEditor from '@/views/docs/components/DocumentEditor.vue'

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
    body: [] as TiptapJsonContent,
    ...overrides,
  }
}

describe('documentEditor', () => {
  it('把正文编辑区的评论请求继续上抛给文档层', async () => {
    const wrapper = mount(DocumentEditor, {
      props: {
        document: createDocument(),
        metadata: null,
        mode: 'default',
      },
      global: {
        stubs: {
          DocumentTitleEditor: defineComponent({
            template: '<div class="document-title-editor-stub" />',
          }),
          DocumentBodyEditor: defineComponent({
            emits: ['request-comment'],
            template: `
              <button
                class="document-body-editor-stub"
                type="button"
                @click="$emit('request-comment', { source: 'bubble-toolbar' })"
              >
                请求评论
              </button>
            `,
          }),
          SvgIcon: defineComponent({
            template: '<span class="svg-icon-stub" />',
          }),
        },
      },
    })

    await wrapper.get('.document-body-editor-stub').trigger('click')

    expect(wrapper.emitted('requestComment')).toEqual([
      [{ source: 'bubble-toolbar' }],
    ])
  })
})
