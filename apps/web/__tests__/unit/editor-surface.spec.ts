import type { Editor } from '@tiptap/vue-3'
import { flushPromises, mount } from '@vue/test-utils'
import { TiptapEditor } from '@/components/tiptap-editor'

describe('editorSurface', () => {
  it('renders initial content without the legacy top toolbar', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: '<h1>欢迎来到 SamePage</h1><p>这是第一篇文档。</p>',
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('欢迎来到 SamePage')
    expect(wrapper.find('[role="toolbar"]').exists()).toBe(false)
  })

  it('syncs editor content when the content prop changes', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: '<h1>欢迎来到 SamePage</h1><p>这是第一篇文档。</p>',
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('欢迎来到 SamePage')

    await wrapper.setProps({
      content: '<h1>产品简报</h1><p>SamePage 的目标是构建一个中文优先的协作文档平台。</p>',
    })
    await flushPromises()

    expect(wrapper.text()).toContain('产品简报')
    expect(wrapper.text()).not.toContain('欢迎来到 SamePage')
  })

  it('emits updated content after the editor instance mutates the document', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: '<p>这是第一篇文档。</p>',
      },
    })

    await flushPromises()

    const vm = wrapper.vm as { editor: Editor | null }
    vm.editor?.commands.setContent('<p>更新后的正文</p>')
    await flushPromises()

    const updates = wrapper.emitted('update:content')

    expect(updates).toBeTruthy()
    expect(updates?.at(-1)?.[0]).toContain('更新后的正文')
  })
})
