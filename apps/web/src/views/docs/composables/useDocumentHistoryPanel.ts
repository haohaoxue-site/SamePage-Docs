import type { DocumentSnapshot } from '@haohaoxue/samepage-domain'
import type {
  ComputedRef,
  MaybeRefOrGetter,
} from 'vue'
import type {
  ActiveDocumentDetail,
  DocumentHistoryEntry,
  DocumentHistoryGroup,
  DocumentHistorySection,
} from '../typing'
import {
  computed,
  shallowRef,
  toValue,
  watch,
} from 'vue'
import {
  buildDocumentHistorySections,
  getDocumentHistoryEntryDetail,
} from '../utils/documentHistory'

/**
 * 文档历史面板组合参数。
 */
interface UseDocumentHistoryPanelOptions {
  document: MaybeRefOrGetter<ActiveDocumentDetail | null>
  snapshots: MaybeRefOrGetter<DocumentSnapshot[]>
  isRestoring: MaybeRefOrGetter<boolean>
  onRestore: (snapshotId: string) => void
}

/**
 * 文档历史选中态组合参数。
 */
interface UseDocumentHistorySelectionOptions {
  historySections: ComputedRef<DocumentHistorySection[]>
  isRestoring: MaybeRefOrGetter<boolean>
  onRestore: (snapshotId: string) => void
}

/**
 * 文档历史分组展开态组合参数。
 */
interface UseDocumentHistoryGroupStateOptions {
  historySections: ComputedRef<DocumentHistorySection[]>
  selectedSnapshotId: ComputedRef<string | null>
}

export function useDocumentHistoryPanel({
  document,
  snapshots,
  isRestoring,
  onRestore,
}: UseDocumentHistoryPanelOptions) {
  const hasDocument = computed(() => Boolean(toValue(document)))
  const historySections = computed(() => buildDocumentHistorySections({
    document: toValue(document),
    snapshots: toValue(snapshots),
  }))
  const selection = useDocumentHistorySelection({
    historySections,
    isRestoring,
    onRestore,
  })
  const groups = useDocumentHistoryGroupState({
    historySections,
    selectedSnapshotId: selection.selectedSnapshotId,
  })

  function selectEntry(snapshotId: string) {
    selection.selectEntry(snapshotId)
    groups.expandGroupBySnapshotId(snapshotId)
  }

  return {
    hasDocument,
    historySections,
    canRestoreSelectedEntry: selection.canRestoreSelectedEntry,
    isGroupExpanded: groups.isGroupExpanded,
    selectEntry,
    toggleGroup: groups.toggleGroup,
    isEntrySelected: selection.isEntrySelected,
    resolveEntryDetail,
    restoreSelectedEntry: selection.restoreSelectedEntry,
  }
}

function useDocumentHistorySelection({
  historySections,
  isRestoring,
  onRestore,
}: UseDocumentHistorySelectionOptions) {
  const selectedSnapshotId = shallowRef<string | null>(null)
  const historyEntries = computed(() => flattenHistoryEntries(historySections.value))
  const selectedEntry = computed(() => historyEntries.value.find(
    entry => entry.snapshotId === selectedSnapshotId.value,
  ) ?? null)
  const canRestoreSelectedEntry = computed(() => {
    const entry = selectedEntry.value

    if (!entry) {
      return false
    }

    return !entry.isCurrentContent && !toValue(isRestoring)
  })

  watch(
    historySections,
    (nextSections) => {
      selectedSnapshotId.value = resolveNextSelectedSnapshotId(nextSections, selectedSnapshotId.value)
    },
    { immediate: true },
  )

  function selectEntry(snapshotId: string) {
    selectedSnapshotId.value = snapshotId
  }

  function isEntrySelected(entry: DocumentHistoryEntry) {
    return selectedSnapshotId.value === entry.snapshotId
  }

  function restoreSelectedEntry() {
    if (!selectedEntry.value || !canRestoreSelectedEntry.value) {
      return
    }

    onRestore(selectedEntry.value.snapshotId)
  }

  return {
    selectedSnapshotId: computed(() => selectedSnapshotId.value),
    canRestoreSelectedEntry,
    selectEntry,
    isEntrySelected,
    restoreSelectedEntry,
  }
}

function useDocumentHistoryGroupState({
  historySections,
  selectedSnapshotId,
}: UseDocumentHistoryGroupStateOptions) {
  const expandedGroupState = shallowRef<Record<string, boolean>>({})

  watch(
    [historySections, selectedSnapshotId],
    ([nextSections, nextSelectedSnapshotId]) => {
      const nextExpandedState = buildExpandedGroupState(nextSections, expandedGroupState.value)

      if (nextSelectedSnapshotId) {
        const targetGroup = findHistoryGroupBySnapshotId(nextSections, nextSelectedSnapshotId)

        if (targetGroup?.collapsible) {
          nextExpandedState[targetGroup.id] = true
        }
      }

      expandedGroupState.value = nextExpandedState
    },
    { immediate: true },
  )

  function toggleGroup(groupId: string) {
    expandedGroupState.value = {
      ...expandedGroupState.value,
      [groupId]: !(expandedGroupState.value[groupId] ?? false),
    }
  }

  function expandGroupBySnapshotId(snapshotId: string) {
    const targetGroup = findHistoryGroupBySnapshotId(historySections.value, snapshotId)

    if (!targetGroup?.collapsible) {
      return
    }

    expandedGroupState.value = {
      ...expandedGroupState.value,
      [targetGroup.id]: true,
    }
  }

  function isGroupExpanded(group: DocumentHistoryGroup) {
    return !group.collapsible || (expandedGroupState.value[group.id] ?? group.defaultExpanded)
  }

  return {
    toggleGroup,
    expandGroupBySnapshotId,
    isGroupExpanded,
  }
}

function resolveEntryDetail(entry: DocumentHistoryEntry) {
  return getDocumentHistoryEntryDetail(entry)
}

function flattenHistoryEntries(sections: DocumentHistorySection[]) {
  return sections.flatMap(section => section.groups.flatMap(group => group.entries))
}

function resolveNextSelectedSnapshotId(
  sections: DocumentHistorySection[],
  currentSelectedSnapshotId: string | null,
) {
  const nextEntries = flattenHistoryEntries(sections)

  if (nextEntries.some(entry => entry.snapshotId === currentSelectedSnapshotId)) {
    return currentSelectedSnapshotId
  }

  return nextEntries.find(entry => entry.isCurrentSnapshot)?.snapshotId
    ?? nextEntries[0]?.snapshotId
    ?? null
}

function buildExpandedGroupState(
  sections: DocumentHistorySection[],
  currentExpandedGroupState: Record<string, boolean>,
) {
  const nextExpandedState: Record<string, boolean> = {}

  for (const section of sections) {
    for (const group of section.groups) {
      if (!group.collapsible) {
        continue
      }

      nextExpandedState[group.id] = currentExpandedGroupState[group.id] ?? group.defaultExpanded
    }
  }

  return nextExpandedState
}

function findHistoryGroupBySnapshotId(sections: DocumentHistorySection[], snapshotId: string) {
  return sections
    .flatMap(section => section.groups)
    .find(group => group.entries.some(entry => entry.snapshotId === snapshotId))
}
