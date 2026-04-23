import type { SystemAdminUserItem } from '@/apis/system-admin'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import SystemAdminUserIdentityCell from '@/views/system-admin/components/SystemAdminUserIdentityCell.vue'

function mountIdentityCell(user: SystemAdminUserItem) {
  return mount(SystemAdminUserIdentityCell, {
    props: {
      user,
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

describe('systemAdminUserIdentityCell', () => {
  it('有邮箱时显示 displayName · email', () => {
    const wrapper = mountIdentityCell({
      id: 'user_1',
      email: 'admin@example.com',
      displayName: '管理员',
      userCode: 'SP-ADMIN1',
      avatarUrl: null,
      status: 'ACTIVE',
      isSystemAdmin: true,
      authMethods: ['password'],
      ownedDocumentCount: 3,
      sharedDocumentCount: 5,
      createdAt: '2026-04-21T00:00:00.000Z',
      lastLoginAt: '2026-04-22T00:00:00.000Z',
    } as SystemAdminUserItem)

    expect(wrapper.text()).toContain('管理员 · admin@example.com')
  })

  it('无邮箱时回退显示 displayName · userCode', () => {
    const wrapper = mountIdentityCell({
      id: 'user_2',
      email: null,
      displayName: '访客',
      userCode: 'SP-GUEST1',
      avatarUrl: null,
      status: 'ACTIVE',
      isSystemAdmin: false,
      authMethods: ['github'],
      ownedDocumentCount: 0,
      sharedDocumentCount: 1,
      createdAt: '2026-04-21T00:00:00.000Z',
      lastLoginAt: null,
    } as SystemAdminUserItem)

    expect(wrapper.text()).toContain('访客 · SP-GUEST1')
  })
})
