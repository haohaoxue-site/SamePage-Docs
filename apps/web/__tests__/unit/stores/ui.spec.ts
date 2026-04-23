import { createPinia, setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp, nextTick } from 'vue'
import { UI_PERSIST_KEY, useUiStore } from '@/stores/ui'

describe('ui store', () => {
  beforeEach(() => {
    localStorage.clear()

    const pinia = createPinia()
    pinia.use(piniaPluginPersistedstate)
    createApp({}).use(pinia)
    setActivePinia(pinia)
  })

  it('会从 samepage_ui 恢复文档树、首页 widget 与聊天模型设置', () => {
    localStorage.setItem(UI_PERSIST_KEY, JSON.stringify({
      workspaceSidebarCollapsed: true,
      _documentTreeStateByWorkspaceId: {
        workspace_team_1: {
          expandedDocumentIds: ['doc_1'],
          lastOpenedDocumentId: 'doc_2',
        },
      },
      _homeVisibleWidgetIds: ['welcome', 'schedule'],
      _chatSelectedModel: 'gpt-5.4',
    }))

    const store = useUiStore()

    expect(store.workspaceSidebarCollapsed).toBe(true)
    expect(store.getDocumentTreeState('workspace_team_1')).toEqual({
      expandedDocumentIds: ['doc_1'],
      lastOpenedDocumentId: 'doc_2',
    })
    expect(store.homeVisibleWidgetIds).toEqual(['welcome', 'schedule'])
    expect(store.chatSelectedModel).toBe('gpt-5.4')
  })

  it('更新首页 widget 与聊天模型设置时，不会覆盖文档树状态', async () => {
    localStorage.setItem(UI_PERSIST_KEY, JSON.stringify({
      _documentTreeStateByWorkspaceId: {
        workspace_team_1: {
          expandedDocumentIds: ['doc_1'],
          lastOpenedDocumentId: 'doc_2',
        },
      },
      _homeVisibleWidgetIds: ['welcome'],
      _chatSelectedModel: 'gpt-4.1',
    }))

    const store = useUiStore()

    store.setHomeVisibleWidgetIds(['welcome', 'recent-documents'])
    store.setChatSelectedModel(' gpt-5.4 ')

    await nextTick()

    expect(store.getDocumentTreeState('workspace_team_1')).toEqual({
      expandedDocumentIds: ['doc_1'],
      lastOpenedDocumentId: 'doc_2',
    })
    expect(store.homeVisibleWidgetIds).toEqual(['welcome', 'recent-documents'])
    expect(store.chatSelectedModel).toBe('gpt-5.4')
    expect(JSON.parse(localStorage.getItem(UI_PERSIST_KEY)!)).toMatchObject({
      _documentTreeStateByWorkspaceId: {
        workspace_team_1: {
          expandedDocumentIds: ['doc_1'],
          lastOpenedDocumentId: 'doc_2',
        },
      },
      _homeVisibleWidgetIds: ['welcome', 'recent-documents'],
      _chatSelectedModel: 'gpt-5.4',
    })
  })

  it('允许把聊天模型清空为 null，并把首页 widget 保存为空数组', async () => {
    const store = useUiStore()

    store.setHomeVisibleWidgetIds([])
    store.setChatSelectedModel('  ')

    await nextTick()

    expect(store.homeVisibleWidgetIds).toEqual([])
    expect(store.chatSelectedModel).toBeNull()
    expect(JSON.parse(localStorage.getItem(UI_PERSIST_KEY)!)).toMatchObject({
      _homeVisibleWidgetIds: [],
      _chatSelectedModel: null,
    })
  })
})
