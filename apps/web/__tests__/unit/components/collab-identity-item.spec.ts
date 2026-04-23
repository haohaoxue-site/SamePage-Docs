import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import CollabIdentityItem from '@/components/collab-identity/CollabIdentityItem.vue'

function mountCollabIdentityItem(identity: {
  id: string
  email: string | null
  displayName: string
  avatarUrl: string | null
  userCode: string
}) {
  return mount(CollabIdentityItem, {
    props: {
      identity,
    },
    global: {
      stubs: {
        EntityAvatar: defineComponent({
          template: '<span class="entity-avatar-stub" />',
        }),
      },
    },
  })
}

describe('collabIdentityItem', () => {
  it('有邮箱时显示 displayName · email', () => {
    const wrapper = mountCollabIdentityItem({
      id: 'user_1',
      email: 'member@example.com',
      displayName: '协作者',
      avatarUrl: null,
      userCode: 'SP-ABC2345',
    })

    expect(wrapper.text()).toContain('协作者 · member@example.com')
    expect(wrapper.find('.collab-identity-item__label').attributes('title')).toBe('协作者 · member@example.com')
  })

  it('无邮箱时回退显示 displayName · userCode', () => {
    const wrapper = mountCollabIdentityItem({
      id: 'user_2',
      email: null,
      displayName: '匿名协作者',
      avatarUrl: null,
      userCode: 'SP-GUEST1',
    })

    expect(wrapper.text()).toContain('匿名协作者 · SP-GUEST1')
    expect(wrapper.find('.collab-identity-item__label').attributes('title')).toBe('匿名协作者 · SP-GUEST1')
  })
})
