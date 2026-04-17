import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import BlockTriggerButton from '@/components/tiptap-editor/overlays/block-trigger/BlockTriggerButton.vue'

const SvgIconStub = defineComponent({
  name: 'SvgIcon',
  template: '<span class="svg-icon-stub" />',
})

const TiptapIconStub = defineComponent({
  name: 'TiptapIcon',
  template: '<span class="tiptap-icon-stub" />',
})

describe('blockTriggerButton', () => {
  it('普通文本块展示文本类型图标，并立即允许拖拽', async () => {
    const wrapper = mount(BlockTriggerButton, {
      props: {
        icon: 'T',
        label: '文本',
        isOpen: false,
        isPeekVisible: true,
        canDrag: true,
        isDragging: false,
      },
      global: {
        stubs: {
          SvgIcon: SvgIconStub,
          TiptapIcon: TiptapIconStub,
        },
      },
    })

    expect(wrapper.get('button').attributes('draggable')).toBe('true')
    expect(wrapper.findAll('.tiptap-icon-stub')).toHaveLength(2)

    await wrapper.get('button').trigger('dragstart')
    expect(wrapper.emitted('dragstart')).toHaveLength(1)
  })

  it('列表块展示图标，空行保持不可拖拽', () => {
    const listWrapper = mount(BlockTriggerButton, {
      props: {
        icon: 'list-ul',
        label: '无序列表',
        isOpen: false,
        isPeekVisible: true,
        canDrag: true,
        isDragging: false,
      },
      global: {
        stubs: {
          SvgIcon: SvgIconStub,
          TiptapIcon: TiptapIconStub,
        },
      },
    })

    expect(listWrapper.get('button').attributes('title')).toBe('无序列表')
    expect(listWrapper.get('button').attributes('draggable')).toBe('true')

    const emptyWrapper = mount(BlockTriggerButton, {
      props: {
        icon: '+',
        label: '插入块',
        isOpen: false,
        isPeekVisible: true,
        canDrag: false,
        isDragging: false,
      },
      global: {
        stubs: {
          SvgIcon: SvgIconStub,
          TiptapIcon: TiptapIconStub,
        },
      },
    })

    expect(emptyWrapper.get('button').attributes('draggable')).toBe('false')
    expect(emptyWrapper.text()).toContain('+')
  })
})
