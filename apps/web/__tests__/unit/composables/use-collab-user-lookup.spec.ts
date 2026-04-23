import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCollabUserLookup } from '@/composables/useCollabUserLookup'
import { useUserStore } from '@/stores/user'

const userApiMocks = vi.hoisted(() => ({
  findUserByCode: vi.fn(),
}))

vi.mock('@/apis/user', () => ({
  findUserByCode: userApiMocks.findUserByCode,
}))

function hydrateCurrentUser() {
  const userStore = useUserStore()

  userStore.setCurrentUser({
    id: 'user_self',
    email: 'self@example.com',
    displayName: '当前用户',
    avatarUrl: null,
    userCode: 'SP-SELF234',
    roles: [],
    permissions: [],
    authMethods: [],
    mustChangePassword: false,
    emailVerified: true,
  })

  return userStore
}

describe('useCollabUserLookup', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    userApiMocks.findUserByCode.mockReset()
  })

  it('不完整的 userCode 会直接返回未找到用户且不发请求', async () => {
    hydrateCurrentUser()
    const lookup = useCollabUserLookup()

    const result = await lookup.lookupUserByCode('abc2345')

    expect(result).toBeNull()
    expect(lookup.lookupErrorMessage.value).toBe('未找到用户')
    expect(userApiMocks.findUserByCode).not.toHaveBeenCalled()
  })

  it('会 trim 并转成大写后再按完整 userCode 精确查询', async () => {
    hydrateCurrentUser()
    userApiMocks.findUserByCode.mockResolvedValue({
      id: 'user_target',
      email: 'member@example.com',
      displayName: '团队成员',
      avatarUrl: null,
      userCode: 'SP-ABC2345',
    })

    const lookup = useCollabUserLookup()
    const result = await lookup.lookupUserByCode('  sp-abc2345 ')

    expect(userApiMocks.findUserByCode).toHaveBeenCalledWith('SP-ABC2345')
    expect(result).toEqual({
      id: 'user_target',
      email: 'member@example.com',
      displayName: '团队成员',
      avatarUrl: null,
      userCode: 'SP-ABC2345',
    })
    expect(lookup.lookupErrorMessage.value).toBe('')
    expect(lookup.matchedUser.value).toEqual(result)
  })

  it('命中自己时会按调用方口径拦截', async () => {
    hydrateCurrentUser()
    userApiMocks.findUserByCode.mockResolvedValue({
      id: 'user_self',
      email: 'self@example.com',
      displayName: '当前用户',
      avatarUrl: null,
      userCode: 'SP-SELF234',
    })

    const lookup = useCollabUserLookup({
      selfTargetMessage: '不能邀请自己',
    })
    const result = await lookup.lookupUserByCode('SP-SELF234')

    expect(result).toBeNull()
    expect(lookup.lookupErrorMessage.value).toBe('不能邀请自己')
    expect(lookup.matchedUser.value).toBeNull()
  })
})
