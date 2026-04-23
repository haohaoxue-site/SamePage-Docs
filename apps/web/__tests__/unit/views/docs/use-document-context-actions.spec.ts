import { describe, expect, it, vi } from 'vitest'
import { useDocumentContextActions } from '@/views/docs/composables/useDocumentContextActions'

describe('useDocumentContextActions', () => {
  it('根据 dropdown command 分发菜单动作', () => {
    const onOpenHistory = vi.fn()
    const onMoveDocumentToTeam = vi.fn()
    const onDeleteDocument = vi.fn()
    const { handleCommand, menuVisible } = useDocumentContextActions(
      { canDeleteDocument: true, canMoveToTeam: false },
      {
        onOpenHistory,
        onMoveDocumentToTeam,
        onDeleteDocument,
      },
    )

    menuVisible.value = true
    handleCommand('history')

    expect(onOpenHistory).toHaveBeenCalledTimes(1)
    expect(onMoveDocumentToTeam).not.toHaveBeenCalled()
    expect(onDeleteDocument).not.toHaveBeenCalled()
    expect(menuVisible.value).toBe(false)
  })

  it('打开历史记录时会关闭菜单并触发回调', () => {
    const onOpenHistory = vi.fn()
    const onMoveDocumentToTeam = vi.fn()
    const onDeleteDocument = vi.fn()
    const { menuVisible, openHistory } = useDocumentContextActions(
      { canDeleteDocument: true, canMoveToTeam: false },
      {
        onOpenHistory,
        onMoveDocumentToTeam,
        onDeleteDocument,
      },
    )

    menuVisible.value = true
    openHistory()

    expect(onOpenHistory).toHaveBeenCalledTimes(1)
    expect(onMoveDocumentToTeam).not.toHaveBeenCalled()
    expect(onDeleteDocument).not.toHaveBeenCalled()
    expect(menuVisible.value).toBe(false)
  })

  it('只有可删除时才触发删除并关闭菜单', () => {
    const blockedDelete = vi.fn()
    const allowedDelete = vi.fn()
    const blockedActions = useDocumentContextActions(
      { canDeleteDocument: false, canMoveToTeam: false },
      {
        onOpenHistory: vi.fn(),
        onMoveDocumentToTeam: vi.fn(),
        onDeleteDocument: blockedDelete,
      },
    )
    const allowedActions = useDocumentContextActions(
      { canDeleteDocument: true, canMoveToTeam: false },
      {
        onOpenHistory: vi.fn(),
        onMoveDocumentToTeam: vi.fn(),
        onDeleteDocument: allowedDelete,
      },
    )

    blockedActions.menuVisible.value = true
    allowedActions.menuVisible.value = true

    blockedActions.deleteDocument()
    allowedActions.deleteDocument()

    expect(blockedDelete).not.toHaveBeenCalled()
    expect(allowedDelete).toHaveBeenCalledTimes(1)
    expect(blockedActions.menuVisible.value).toBe(true)
    expect(allowedActions.menuVisible.value).toBe(false)
  })

  it('只有允许移到团队时才触发对应动作并关闭菜单', () => {
    const blockedMove = vi.fn()
    const allowedMove = vi.fn()
    const blockedActions = useDocumentContextActions(
      { canDeleteDocument: true, canMoveToTeam: false },
      {
        onOpenHistory: vi.fn(),
        onMoveDocumentToTeam: blockedMove,
        onDeleteDocument: vi.fn(),
      },
    )
    const allowedActions = useDocumentContextActions(
      { canDeleteDocument: true, canMoveToTeam: true },
      {
        onOpenHistory: vi.fn(),
        onMoveDocumentToTeam: allowedMove,
        onDeleteDocument: vi.fn(),
      },
    )

    blockedActions.menuVisible.value = true
    allowedActions.menuVisible.value = true

    blockedActions.moveDocumentToTeam()
    allowedActions.moveDocumentToTeam()

    expect(blockedMove).not.toHaveBeenCalled()
    expect(allowedMove).toHaveBeenCalledTimes(1)
    expect(blockedActions.menuVisible.value).toBe(true)
    expect(allowedActions.menuVisible.value).toBe(false)
  })
})
