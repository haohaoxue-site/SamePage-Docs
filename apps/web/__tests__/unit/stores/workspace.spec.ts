import { createPinia, setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, nextTick } from 'vue'
import { useWorkspaceStore, WORKSPACE_PERSIST_KEY } from '@/stores/workspace'

const workspaceApiMocks = vi.hoisted(() => ({
  getPersonalWorkspace: vi.fn(),
  getVisibleTeamWorkspaces: vi.fn(),
  createTeamWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
  updateTeamWorkspaceIcon: vi.fn(),
}))

vi.mock('@/apis/workspace', () => ({
  getPersonalWorkspace: workspaceApiMocks.getPersonalWorkspace,
  getVisibleTeamWorkspaces: workspaceApiMocks.getVisibleTeamWorkspaces,
  createTeamWorkspace: workspaceApiMocks.createTeamWorkspace,
  deleteWorkspace: workspaceApiMocks.deleteWorkspace,
  updateTeamWorkspaceIcon: workspaceApiMocks.updateTeamWorkspaceIcon,
}))

describe('workspace store', () => {
  beforeEach(() => {
    localStorage.clear()
    workspaceApiMocks.getPersonalWorkspace.mockReset()
    workspaceApiMocks.getVisibleTeamWorkspaces.mockReset()
    workspaceApiMocks.createTeamWorkspace.mockReset()
    workspaceApiMocks.deleteWorkspace.mockReset()
    workspaceApiMocks.updateTeamWorkspaceIcon.mockReset()
    setupPinia()
  })

  it('团队空间列表在无访问记录时按创建时间倒序展示', () => {
    const store = useWorkspaceStore()

    store.setTeamWorkspaces([
      {
        id: 'workspace_team_older',
        type: 'TEAM',
        name: '旧团队',
        description: null,
        iconUrl: null,
        slug: 'old-team',
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: '2026-04-18T00:00:00.000Z',
        createdAt: '2026-04-18T00:00:00.000Z',
        updatedAt: '2026-04-18T00:00:00.000Z',
      },
      {
        id: 'workspace_team_newer',
        type: 'TEAM',
        name: '新团队',
        description: null,
        iconUrl: null,
        slug: 'new-team',
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: '2026-04-20T00:00:00.000Z',
        createdAt: '2026-04-20T00:00:00.000Z',
        updatedAt: '2026-04-20T00:00:00.000Z',
      },
    ])

    expect(store.teamWorkspaces.map(workspace => workspace.id)).toEqual([
      'workspace_team_newer',
      'workspace_team_older',
    ])
  })

  it('切换团队空间后会按最近访问时间把该团队排到前面', () => {
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-21T12:00:00.000Z').getTime())
    const store = useWorkspaceStore()

    store.setPersonalWorkspace({
      id: 'workspace_personal_1',
      type: 'PERSONAL',
      name: 'Personal SP-ABC2345',
      description: null,
      iconUrl: null,
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    })
    store.setTeamWorkspaces([
      {
        id: 'workspace_team_newer',
        type: 'TEAM',
        name: '新团队',
        description: null,
        iconUrl: null,
        slug: 'new-team',
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: '2026-04-20T00:00:00.000Z',
        createdAt: '2026-04-20T00:00:00.000Z',
        updatedAt: '2026-04-20T00:00:00.000Z',
      },
      {
        id: 'workspace_team_older',
        type: 'TEAM',
        name: '旧团队',
        description: null,
        iconUrl: null,
        slug: 'old-team',
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: '2026-04-18T00:00:00.000Z',
        createdAt: '2026-04-18T00:00:00.000Z',
        updatedAt: '2026-04-18T00:00:00.000Z',
      },
    ])

    store.selectWorkspace('workspace_team_older')

    expect(store.switchableWorkspaces.map(workspace => workspace.id)).toEqual([
      'workspace_personal_1',
      'workspace_team_older',
      'workspace_team_newer',
    ])

    dateNowSpy.mockRestore()
  })

  it('切回我的空间时会固定解析到底层 personal workspace', () => {
    const store = useWorkspaceStore()

    store.setPersonalWorkspace({
      id: 'workspace_personal_1',
      type: 'PERSONAL',
      name: 'Personal SP-ABC2345',
      description: null,
      iconUrl: null,
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    })
    store.setTeamWorkspaces([
      {
        id: 'workspace_team_1',
        type: 'TEAM',
        name: '产品团队',
        description: '协作空间',
        iconUrl: null,
        slug: 'product-team',
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: '2026-04-21T00:00:00.000Z',
        createdAt: '2026-04-20T00:00:00.000Z',
        updatedAt: '2026-04-21T00:00:00.000Z',
      },
    ])
    store.selectWorkspace('workspace_team_1')

    expect(store.currentWorkspace?.id).toBe('workspace_team_1')

    store.selectPersonalWorkspace()

    expect(store.currentWorkspace?.id).toBe('workspace_personal_1')
    expect(store.currentWorkspaceType).toBe('PERSONAL')
    expect(store.currentWorkspaceLabel).toBe('我的空间')
  })

  it('refreshVisibleWorkspaces 会把隐藏 personal workspace 解析成我的空间且不暴露底层说明', async () => {
    workspaceApiMocks.getPersonalWorkspace.mockResolvedValue({
      id: 'workspace_personal_1',
      type: 'PERSONAL',
      name: 'Personal SP-ABC2345',
      description: '内部 personal 容器',
      iconUrl: null,
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    })
    workspaceApiMocks.getVisibleTeamWorkspaces.mockResolvedValue([
      {
        id: 'workspace_team_1',
        type: 'TEAM',
        name: '产品团队',
        description: '协作空间',
        iconUrl: null,
        slug: 'product-team',
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: '2026-04-21T00:00:00.000Z',
        createdAt: '2026-04-20T00:00:00.000Z',
        updatedAt: '2026-04-21T00:00:00.000Z',
      },
    ])

    const store = useWorkspaceStore()

    await store.refreshVisibleWorkspaces()

    expect(store.currentWorkspace?.id).toBe('workspace_personal_1')
    expect(store.currentWorkspaceLabel).toBe('我的空间')
    expect(store.switchableWorkspaces).toEqual([
      {
        id: 'workspace_personal_1',
        type: 'PERSONAL',
        label: '我的空间',
        iconUrl: null,
      },
      {
        id: 'workspace_team_1',
        type: 'TEAM',
        label: '产品团队',
        description: '协作空间',
        iconUrl: null,
      },
    ])
  })

  it('无效选中的 workspace 会回落到 personal workspace', async () => {
    workspaceApiMocks.getPersonalWorkspace.mockResolvedValue({
      id: 'workspace_personal_1',
      type: 'PERSONAL',
      name: 'Personal SP-ABC2345',
      description: null,
      iconUrl: null,
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    })
    workspaceApiMocks.getVisibleTeamWorkspaces.mockResolvedValue([])

    const store = useWorkspaceStore()
    store.selectWorkspace('workspace_team_missing')

    await store.refreshVisibleWorkspaces()

    expect(store.currentWorkspace?.id).toBe('workspace_personal_1')
    expect(store.currentWorkspaceType).toBe('PERSONAL')
    expect(store.currentWorkspaceLabel).toBe('我的空间')
  })

  it('refreshVisibleWorkspaces 不会在刷新时冲掉已选中的 team workspace', async () => {
    workspaceApiMocks.getPersonalWorkspace.mockResolvedValue({
      id: 'workspace_personal_1',
      type: 'PERSONAL',
      name: 'Personal SP-ABC2345',
      description: null,
      iconUrl: null,
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    })
    workspaceApiMocks.getVisibleTeamWorkspaces.mockResolvedValue([
      {
        id: 'workspace_team_1',
        type: 'TEAM',
        name: '产品团队',
        description: '协作空间',
        iconUrl: null,
        slug: 'product-team',
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: '2026-04-21T00:00:00.000Z',
        createdAt: '2026-04-20T00:00:00.000Z',
        updatedAt: '2026-04-21T00:00:00.000Z',
      },
    ])

    const store = useWorkspaceStore()
    store.setPersonalWorkspace({
      id: 'workspace_personal_1',
      type: 'PERSONAL',
      name: 'Personal SP-ABC2345',
      description: null,
      iconUrl: null,
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    })
    store.setTeamWorkspaces([
      {
        id: 'workspace_team_1',
        type: 'TEAM',
        name: '产品团队',
        description: '协作空间',
        iconUrl: null,
        slug: 'product-team',
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: '2026-04-21T00:00:00.000Z',
        createdAt: '2026-04-20T00:00:00.000Z',
        updatedAt: '2026-04-21T00:00:00.000Z',
      },
    ])
    store.selectWorkspace('workspace_team_1')

    await store.refreshVisibleWorkspaces()

    expect(store.currentWorkspace?.id).toBe('workspace_team_1')
    expect(store.currentWorkspaceType).toBe('TEAM')
    expect(store.currentWorkspaceLabel).toBe('产品团队')
  })

  it('会从 samepage_workspace 恢复上次选中的 team workspace', async () => {
    const firstStore = useWorkspaceStore()

    firstStore.setVisibleWorkspaces({
      personalWorkspace: {
        id: 'workspace_personal_1',
        type: 'PERSONAL',
        name: 'Personal SP-ABC2345',
        description: null,
        iconUrl: null,
        createdAt: '2026-04-21T00:00:00.000Z',
        updatedAt: '2026-04-21T00:00:00.000Z',
      },
      teamWorkspaces: [
        {
          id: 'workspace_team_1',
          type: 'TEAM',
          name: '产品团队',
          description: '协作空间',
          iconUrl: null,
          slug: 'product-team',
          role: 'OWNER',
          status: 'ACTIVE',
          joinedAt: '2026-04-21T00:00:00.000Z',
          createdAt: '2026-04-20T00:00:00.000Z',
          updatedAt: '2026-04-21T00:00:00.000Z',
        },
      ],
    })
    firstStore.selectWorkspace('workspace_team_1')

    await nextTick()

    expect(JSON.parse(localStorage.getItem(WORKSPACE_PERSIST_KEY)!)).toMatchObject({
      _selectedWorkspaceId: 'workspace_team_1',
    })

    setupPinia()

    const restoredStore = useWorkspaceStore()

    restoredStore.setVisibleWorkspaces({
      personalWorkspace: {
        id: 'workspace_personal_1',
        type: 'PERSONAL',
        name: 'Personal SP-ABC2345',
        description: null,
        iconUrl: null,
        createdAt: '2026-04-21T00:00:00.000Z',
        updatedAt: '2026-04-21T00:00:00.000Z',
      },
      teamWorkspaces: [
        {
          id: 'workspace_team_1',
          type: 'TEAM',
          name: '产品团队',
          description: '协作空间',
          iconUrl: null,
          slug: 'product-team',
          role: 'OWNER',
          status: 'ACTIVE',
          joinedAt: '2026-04-21T00:00:00.000Z',
          createdAt: '2026-04-20T00:00:00.000Z',
          updatedAt: '2026-04-21T00:00:00.000Z',
        },
      ],
    })

    expect(restoredStore.currentWorkspace?.id).toBe('workspace_team_1')
    expect(restoredStore.currentWorkspaceType).toBe('TEAM')
    expect(restoredStore.currentWorkspaceLabel).toBe('产品团队')
  })

  it('删除当前团队后会从 store 中移除并回落到 personal workspace', async () => {
    workspaceApiMocks.deleteWorkspace.mockResolvedValue(null)

    const store = useWorkspaceStore()

    store.setPersonalWorkspace({
      id: 'workspace_personal_1',
      type: 'PERSONAL',
      name: 'Personal SP-ABC2345',
      description: null,
      iconUrl: null,
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    })
    store.setTeamWorkspaces([
      {
        id: 'workspace_team_1',
        type: 'TEAM',
        name: '产品团队',
        description: '协作空间',
        iconUrl: null,
        slug: 'product-team',
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: '2026-04-21T00:00:00.000Z',
        createdAt: '2026-04-20T00:00:00.000Z',
        updatedAt: '2026-04-21T00:00:00.000Z',
      },
    ])
    store.selectWorkspace('workspace_team_1')

    await store.deleteWorkspace('workspace_team_1')

    expect(workspaceApiMocks.deleteWorkspace).toHaveBeenCalledWith('workspace_team_1')
    expect(store.teamWorkspaces).toEqual([])
    expect(store.currentWorkspace?.id).toBe('workspace_personal_1')
    expect(store.currentWorkspaceType).toBe('PERSONAL')
    expect(store.currentWorkspaceLabel).toBe('我的空间')
  })

  it('当前空间 getter 会直接复用 store owner 引用，而不是额外创建冻结快照', () => {
    const store = useWorkspaceStore()

    store.setPersonalWorkspace({
      id: 'workspace_personal_1',
      type: 'PERSONAL',
      name: 'Personal SP-ABC2345',
      description: null,
      iconUrl: null,
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    })
    store.setTeamWorkspaces([
      {
        id: 'workspace_team_1',
        type: 'TEAM',
        name: '产品团队',
        description: '协作空间',
        iconUrl: null,
        slug: 'product-team',
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: '2026-04-21T00:00:00.000Z',
        createdAt: '2026-04-20T00:00:00.000Z',
        updatedAt: '2026-04-21T00:00:00.000Z',
      },
    ])

    expect(store.personalWorkspace).toBe(store.currentWorkspace)
    expect(Object.isFrozen(store.personalWorkspace!)).toBe(false)

    store.selectWorkspace('workspace_team_1')

    expect(store.currentWorkspace).toBe(store.teamWorkspaces[0])
    expect(Object.isFrozen(store.currentWorkspace!)).toBe(false)
  })
})

function setupPinia() {
  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)
  createApp({}).use(pinia)
  setActivePinia(pinia)
}
