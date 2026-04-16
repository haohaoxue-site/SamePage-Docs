import type { DocumentSnapshot } from '@haohaoxue/samepage-domain'
import type {
  ActiveDocumentDetail,
  DocumentEditorMeta,
} from '../typing'
import dayjs from '@/utils/dayjs'

interface DocumentEditorUserSource {
  displayName: string
  avatarUrl: string | null
}

export function buildDocumentEditorMeta(options: {
  document: ActiveDocumentDetail | null
  snapshots: DocumentSnapshot[]
  fallbackUser: DocumentEditorUserSource | null
}) {
  if (!options.document) {
    return null
  }

  const actor = resolveDocumentActor({
    document: options.document,
    snapshots: options.snapshots,
    fallbackUser: options.fallbackUser,
  })

  return {
    user: {
      displayName: actor.displayName,
      avatarUrl: actor.avatarUrl,
      initial: actor.displayName.trim().slice(0, 1).toUpperCase() || 'U',
    },
    updatedLabel: formatUpdatedLabel(options.document.updatedAt),
    createdLabel: `${dayjs(options.document.createdAt).format('M月D日')}创建`,
  } satisfies DocumentEditorMeta
}

export function buildHistoryPreviewDocument(options: {
  document: ActiveDocumentDetail | null
  snapshot: DocumentSnapshot | null
}) {
  if (!options.document) {
    return null
  }

  if (!options.snapshot) {
    return options.document
  }

  return {
    ...options.document,
    latestSnapshotId: options.snapshot.id,
    headRevision: options.snapshot.revision,
    schemaVersion: options.snapshot.schemaVersion,
    updatedAt: options.snapshot.createdAt,
    title: options.snapshot.title,
    body: options.snapshot.body,
  } satisfies ActiveDocumentDetail
}

export function resolveDefaultHistorySnapshotId(options: {
  document: ActiveDocumentDetail | null
  snapshots: DocumentSnapshot[]
  currentSelectedSnapshotId: string | null
}) {
  if (options.snapshots.some(snapshot => snapshot.id === options.currentSelectedSnapshotId)) {
    return options.currentSelectedSnapshotId
  }

  return options.document?.latestSnapshotId
    ?? options.snapshots[0]?.id
    ?? null
}

function resolveDocumentActor(options: {
  document: ActiveDocumentDetail
  snapshots: DocumentSnapshot[]
  fallbackUser: DocumentEditorUserSource | null
}) {
  const latestSnapshot = options.snapshots.find(
    snapshot => snapshot.id === options.document.latestSnapshotId,
  ) ?? options.snapshots[0] ?? null

  return latestSnapshot?.createdByUser ?? options.fallbackUser ?? {
    displayName: '未知用户',
    avatarUrl: null,
  }
}

function formatUpdatedLabel(value: string) {
  const target = dayjs(value)
  const now = dayjs()

  if (target.isSame(now, 'day')) {
    return '今天修改'
  }

  if (target.isSame(now.subtract(1, 'day'), 'day')) {
    return '昨天修改'
  }

  return `${target.format('M月D日')}修改`
}
