import type { DocumentShareProjection, DocumentTreeGroup } from '@haohaoxue/samepage-domain'
import {
  APPEARANCE_PREFERENCE,
  DOCUMENT_COLLECTION,
  DOCUMENT_SHARE_MODE,
  LANGUAGE_PREFERENCE,
} from '@haohaoxue/samepage-contracts'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, effectScope, nextTick, shallowRef } from 'vue'
import { useUserStore } from '@/stores/user'
import { useWorkspaceStore } from '@/stores/workspace'
import { useDocs } from '@/views/docs/composables/useDocs'

const vueRouterMocks = vi.hoisted(() => ({
  route: {
    name: 'docs',
    params: {
      id: 'team-doc',
    },
    hash: '',
    path: '/docs/team-doc',
    fullPath: '/docs/team-doc',
  },
  push: vi.fn(),
  replace: vi.fn(),
}))

const docsComposableMocks = vi.hoisted(() => ({
  tree: null as ReturnType<typeof createDocumentTreeMock> | null,
  activeDocument: null as ReturnType<typeof createActiveDocumentMock> | null,
}))

vi.mock('vue-router', () => ({
  useRoute: () => vueRouterMocks.route,
  useRouter: () => ({
    push: vueRouterMocks.push,
    replace: vueRouterMocks.replace,
  }),
  onBeforeRouteLeave: vi.fn(),
  onBeforeRouteUpdate: vi.fn(),
}))

vi.mock('@/views/docs/composables/useDocumentTree', () => ({
  useDocumentTree: () => docsComposableMocks.tree!,
}))

vi.mock('@/views/docs/composables/useActiveDocument', () => ({
  useActiveDocument: () => docsComposableMocks.activeDocument!,
}))

function createDocumentTreeMock(
  groups: DocumentTreeGroup[],
  defaultDocumentId: string | null,
  activeCollectionId: DocumentTreeGroup['id'] | null = null,
) {
  return {
    treeGroups: shallowRef(groups),
    activeCollectionId: shallowRef(activeCollectionId),
    breadcrumbLabels: shallowRef<string[]>(['文档']),
    expandedDocumentIdSet: computed(() => new Set<string>()),
    isDocumentLoading: shallowRef(false),
    isCreating: shallowRef(false),
    isMutatingTree: shallowRef(false),
    defaultDocumentId: shallowRef(defaultDocumentId),
    hasFallbackDocument: computed(() => Boolean(defaultDocumentId)),
    loadTree: vi.fn().mockResolvedValue(undefined),
    toggleDocument: vi.fn(),
    ensureExpandedPath: vi.fn(),
    patchDocumentItem: vi.fn(),
    rememberLastOpenedDocument: vi.fn(),
    createRootDocument: vi.fn(),
    createChildDocument: vi.fn(),
    deleteDocument: vi.fn(),
  }
}

function createActiveDocumentMock() {
  return {
    currentDocument: shallowRef(null),
    snapshots: shallowRef([]),
    isDocumentItemLoading: shallowRef(false),
    isSnapshotsLoading: shallowRef(false),
    isSaving: shallowRef(false),
    isRestoringSnapshot: shallowRef(false),
    saveState: shallowRef('saved'),
    saveStateLabel: shallowRef('已保存'),
    documentErrorState: shallowRef(null),
    confirmNavigation: vi.fn().mockResolvedValue(true),
    reloadCurrentDocument: vi.fn(),
    patchDocumentShare: vi.fn(),
    restoreSnapshot: vi.fn(),
    updateDocumentTitle: vi.fn(),
    updateDocumentContent: vi.fn(),
  }
}

function createDirectShareProjection(): DocumentShareProjection {
  return {
    localPolicy: {
      mode: DOCUMENT_SHARE_MODE.DIRECT_USER,
      shareId: 'share-direct-1',
      directUserCount: 1,
      updatedAt: '2026-04-23T08:00:00.000Z',
      updatedBy: 'user-1',
    },
    effectivePolicy: {
      mode: DOCUMENT_SHARE_MODE.DIRECT_USER,
      shareId: 'share-direct-1',
      rootDocumentId: 'team-doc',
      rootDocumentTitle: '团队文档',
      updatedAt: '2026-04-23T08:00:00.000Z',
      updatedBy: 'user-1',
    },
  }
}

function createTreeGroups(): DocumentTreeGroup[] {
  return [
    {
      id: DOCUMENT_COLLECTION.PERSONAL,
      nodes: [
        {
          id: 'personal-doc',
          parentId: null,
          title: '个人文档',
          summary: '',
          share: null,
          hasChildren: false,
          hasContent: true,
          createdAt: '2026-04-21T00:00:00.000Z',
          updatedAt: '2026-04-21T00:00:00.000Z',
          children: [],
        },
      ],
    },
    {
      id: DOCUMENT_COLLECTION.TEAM,
      nodes: [
        {
          id: 'team-doc',
          parentId: null,
          title: '团队文档',
          summary: '',
          share: null,
          hasChildren: false,
          hasContent: true,
          createdAt: '2026-04-21T00:00:00.000Z',
          updatedAt: '2026-04-21T00:00:00.000Z',
          children: [],
        },
      ],
    },
  ]
}

function createWorkspaceStoreContext() {
  const userStore = useUserStore()
  const workspaceStore = useWorkspaceStore()

  userStore.setCurrentUser({
    id: 'user-1',
    email: 'user@example.com',
    displayName: '测试用户',
    avatarUrl: null,
    userCode: 'SP-ABC2345',
    roles: [],
    permissions: [],
    authMethods: [],
    mustChangePassword: false,
    emailVerified: true,
  })
  userStore.setSettings({
    profile: {
      displayName: '测试用户',
      avatarUrl: null,
    },
    account: {
      email: 'user@example.com',
      userCode: 'SP-ABC2345',
      hasPasswordAuth: true,
      emailVerified: true,
      github: {
        connected: false,
        username: null,
      },
      linuxDo: {
        connected: false,
        username: null,
      },
    },
    preferences: {
      language: LANGUAGE_PREFERENCE.AUTO,
      appearance: APPEARANCE_PREFERENCE.AUTO,
    },
  })

  return {
    userStore,
    workspaceStore,
  }
}

describe('useDocs', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vueRouterMocks.push.mockReset()
    vueRouterMocks.replace.mockReset()
    vueRouterMocks.route.name = 'docs'
    vueRouterMocks.route.params.id = 'team-doc'
    vueRouterMocks.route.hash = ''
    vueRouterMocks.route.path = '/docs/team-doc'
    vueRouterMocks.route.fullPath = '/docs/team-doc'
    docsComposableMocks.tree = createDocumentTreeMock(createTreeGroups(), 'team-doc', DOCUMENT_COLLECTION.TEAM)
    docsComposableMocks.activeDocument = createActiveDocumentMock()
  })

  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('切回我的空间时，会把不可见的团队文档重定向到个人空间默认文档', async () => {
    const { workspaceStore } = createWorkspaceStoreContext()
    workspaceStore.setPersonalWorkspace({
      id: 'workspace-personal',
      type: 'PERSONAL',
      name: 'Personal SP-ABC2345',
      description: null,
      iconUrl: null,
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    })
    workspaceStore.setTeamWorkspaces([
      {
        id: 'workspace-team',
        type: 'TEAM',
        name: '产品团队',
        description: '协作空间',
        iconUrl: null,
        slug: 'product-team',
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: '2026-04-21T00:00:00.000Z',
        createdAt: '2026-04-21T00:00:00.000Z',
        updatedAt: '2026-04-21T00:00:00.000Z',
      },
    ])
    workspaceStore.selectWorkspace('workspace-team')

    const scope = effectScope()
    scope.run(() => useDocs())

    await Promise.resolve()
    expect(vueRouterMocks.replace).not.toHaveBeenCalled()

    workspaceStore.selectPersonalWorkspace()
    await nextTick()

    expect(vueRouterMocks.replace).toHaveBeenCalledWith({
      name: 'docs',
      params: {
        id: 'personal-doc',
      },
      hash: '',
    })

    scope.stop()
  })

  it('分享设置变更后会同步当前文档和权限树，并静默刷新整棵树校准继承状态', async () => {
    const { workspaceStore } = createWorkspaceStoreContext()
    workspaceStore.setPersonalWorkspace({
      id: 'workspace-personal',
      type: 'PERSONAL',
      name: 'Personal SP-ABC2345',
      description: null,
      iconUrl: null,
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    })
    workspaceStore.selectPersonalWorkspace()

    const scope = effectScope()
    const docs = scope.run(() => useDocs())
    const share = createDirectShareProjection()

    docs?.applyDocumentShareChanged({
      documentId: 'team-doc',
      share,
    })

    expect(docsComposableMocks.tree?.patchDocumentItem).toHaveBeenCalledWith('team-doc', {
      share,
    })
    expect(docsComposableMocks.activeDocument?.patchDocumentShare).toHaveBeenCalledWith('team-doc', share)
    expect(docsComposableMocks.tree?.loadTree).toHaveBeenCalledWith({
      silent: true,
    })

    scope.stop()
  })

  it('初次进入文档页时，也会把当前空间不可见的团队文档解析回个人空间默认文档', async () => {
    const { workspaceStore } = createWorkspaceStoreContext()
    workspaceStore.setPersonalWorkspace({
      id: 'workspace-personal',
      type: 'PERSONAL',
      name: 'Personal SP-ABC2345',
      description: null,
      iconUrl: null,
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    })
    workspaceStore.setTeamWorkspaces([
      {
        id: 'workspace-team',
        type: 'TEAM',
        name: '产品团队',
        description: '协作空间',
        iconUrl: null,
        slug: 'product-team',
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: '2026-04-21T00:00:00.000Z',
        createdAt: '2026-04-21T00:00:00.000Z',
        updatedAt: '2026-04-21T00:00:00.000Z',
      },
    ])
    workspaceStore.selectPersonalWorkspace()

    const scope = effectScope()
    scope.run(() => useDocs())

    await nextTick()

    expect(vueRouterMocks.replace).toHaveBeenCalledWith({
      name: 'docs',
      params: {
        id: 'personal-doc',
      },
      hash: '',
    })

    scope.stop()
  })

  it('当前空间从空值恢复后，会重新加载文档树并解析默认文档', async () => {
    const { workspaceStore } = createWorkspaceStoreContext()
    vueRouterMocks.route.params.id = undefined as never
    vueRouterMocks.route.path = '/docs'
    vueRouterMocks.route.fullPath = '/docs'
    docsComposableMocks.tree = createDocumentTreeMock([], null, null)
    docsComposableMocks.tree.loadTree.mockImplementation(async () => {
      if (workspaceStore.currentWorkspace?.id === 'workspace-personal') {
        docsComposableMocks.tree!.defaultDocumentId.value = 'personal-doc'
        docsComposableMocks.tree!.treeGroups.value = [
          {
            id: DOCUMENT_COLLECTION.PERSONAL,
            nodes: [
              {
                id: 'personal-doc',
                parentId: null,
                title: '个人文档',
                summary: '',
                share: null,
                hasChildren: false,
                hasContent: true,
                createdAt: '2026-04-21T00:00:00.000Z',
                updatedAt: '2026-04-21T00:00:00.000Z',
                children: [],
              },
            ],
          },
        ]
      }
    })

    const scope = effectScope()
    scope.run(() => useDocs())

    await Promise.resolve()
    vueRouterMocks.replace.mockReset()

    workspaceStore.setPersonalWorkspace({
      id: 'workspace-personal',
      type: 'PERSONAL',
      name: 'Personal SP-ABC2345',
      description: null,
      iconUrl: null,
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    })
    await nextTick()

    expect(docsComposableMocks.tree.loadTree).toHaveBeenCalledTimes(2)
    expect(vueRouterMocks.replace).toHaveBeenCalledWith({
      name: 'docs',
      params: {
        id: 'personal-doc',
      },
      hash: '',
    })

    scope.stop()
  })

  it('切到团队空间后，会同时投影出团队私有草稿与团队文档两个分组', async () => {
    const { workspaceStore } = createWorkspaceStoreContext()
    workspaceStore.setPersonalWorkspace({
      id: 'workspace-personal',
      type: 'PERSONAL',
      name: 'Personal SP-ABC2345',
      description: null,
      iconUrl: null,
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    })
    workspaceStore.setTeamWorkspaces([
      {
        id: 'workspace-team',
        type: 'TEAM',
        name: '产品团队',
        description: '协作空间',
        iconUrl: null,
        slug: 'product-team',
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: '2026-04-21T00:00:00.000Z',
        createdAt: '2026-04-21T00:00:00.000Z',
        updatedAt: '2026-04-21T00:00:00.000Z',
      },
    ])
    workspaceStore.selectWorkspace('workspace-team')

    const scope = effectScope()
    const docs = scope.run(() => useDocs())

    await Promise.resolve()

    expect(docs?.treeGroups.value.map(group => group.id)).toEqual([
      DOCUMENT_COLLECTION.PERSONAL,
      DOCUMENT_COLLECTION.TEAM,
    ])
    expect(docs?.treeGroups.value[0]).toEqual(expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: 'personal-doc',
        }),
      ]),
    }))
    expect(docs?.treeGroups.value[1]).toEqual(expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: 'team-doc',
        }),
      ]),
    }))

    scope.stop()
  })

  it('切换团队空间后，会重新加载文档树并跳到新空间默认文档', async () => {
    const { workspaceStore } = createWorkspaceStoreContext()
    vueRouterMocks.route.params.id = 'team-a-doc'
    vueRouterMocks.route.path = '/docs/team-a-doc'
    vueRouterMocks.route.fullPath = '/docs/team-a-doc'
    docsComposableMocks.tree = createDocumentTreeMock([
      {
        id: DOCUMENT_COLLECTION.TEAM,
        nodes: [
          {
            id: 'team-a-doc',
            parentId: null,
            title: '团队 A 文档',
            summary: '',
            share: null,
            hasChildren: false,
            hasContent: true,
            createdAt: '2026-04-21T00:00:00.000Z',
            updatedAt: '2026-04-21T00:00:00.000Z',
            children: [],
          },
          {
            id: 'team-b-doc',
            parentId: null,
            title: '团队 B 文档',
            summary: '',
            share: null,
            hasChildren: false,
            hasContent: true,
            createdAt: '2026-04-21T00:00:00.000Z',
            updatedAt: '2026-04-21T00:00:00.000Z',
            children: [],
          },
        ],
      },
    ], 'team-a-doc', DOCUMENT_COLLECTION.TEAM)
    docsComposableMocks.tree.loadTree.mockImplementation(async () => {
      if (workspaceStore.currentWorkspace?.id === 'workspace-team-b') {
        docsComposableMocks.tree!.defaultDocumentId.value = 'team-b-doc'
      }
    })

    workspaceStore.setPersonalWorkspace({
      id: 'workspace-personal',
      type: 'PERSONAL',
      name: 'Personal SP-ABC2345',
      description: null,
      iconUrl: null,
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    })
    workspaceStore.setTeamWorkspaces([
      {
        id: 'workspace-team-a',
        type: 'TEAM',
        name: '团队 A',
        description: '协作空间',
        iconUrl: null,
        slug: 'team-a',
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: '2026-04-21T00:00:00.000Z',
        createdAt: '2026-04-21T00:00:00.000Z',
        updatedAt: '2026-04-21T00:00:00.000Z',
      },
      {
        id: 'workspace-team-b',
        type: 'TEAM',
        name: '团队 B',
        description: '协作空间',
        iconUrl: null,
        slug: 'team-b',
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: '2026-04-21T00:00:00.000Z',
        createdAt: '2026-04-21T00:00:00.000Z',
        updatedAt: '2026-04-21T00:00:00.000Z',
      },
    ])
    workspaceStore.selectWorkspace('workspace-team-a')

    const scope = effectScope()
    scope.run(() => useDocs())

    await Promise.resolve()
    vueRouterMocks.replace.mockReset()

    workspaceStore.selectWorkspace('workspace-team-b')
    await nextTick()

    expect(docsComposableMocks.tree.loadTree).toHaveBeenCalledTimes(2)
    expect(vueRouterMocks.replace).toHaveBeenCalledWith({
      name: 'docs',
      params: {
        id: 'team-b-doc',
      },
      hash: '',
    })

    scope.stop()
  })

  it('处于权限管理总览路由时，不会在初次加载时被默认文档重定向覆盖', async () => {
    const { workspaceStore } = createWorkspaceStoreContext()
    vueRouterMocks.route.name = 'docs-permissions'
    vueRouterMocks.route.params.id = undefined as never
    vueRouterMocks.route.path = '/docs/permissions'
    vueRouterMocks.route.fullPath = '/docs/permissions'

    workspaceStore.setPersonalWorkspace({
      id: 'workspace-personal',
      type: 'PERSONAL',
      name: 'Personal SP-ABC2345',
      description: null,
      iconUrl: null,
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    })

    const scope = effectScope()
    const docs = scope.run(() => useDocs())

    await nextTick()

    expect(docs?.isDocumentSurface.value).toBe(false)
    expect(docs?.currentSurface.value).toBe('permissions')
    expect(vueRouterMocks.replace).not.toHaveBeenCalled()

    scope.stop()
  })

  it('处于待接收共享路由时，会切到独立共享收件箱上下文而不触发默认文档重定向', async () => {
    const { workspaceStore } = createWorkspaceStoreContext()
    vueRouterMocks.route.name = 'docs-pending-shares'
    vueRouterMocks.route.params.id = undefined as never
    vueRouterMocks.route.path = '/docs/pending-shares'
    vueRouterMocks.route.fullPath = '/docs/pending-shares'

    workspaceStore.setPersonalWorkspace({
      id: 'workspace-personal',
      type: 'PERSONAL',
      name: 'Personal SP-ABC2345',
      description: null,
      iconUrl: null,
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    })

    const scope = effectScope()
    const docs = scope.run(() => useDocs())

    await nextTick()

    expect(docs?.isDocumentSurface.value).toBe(false)
    expect(docs?.currentSurface.value).toBe('pending-shares')
    expect(vueRouterMocks.replace).not.toHaveBeenCalled()

    scope.stop()
  })
})
