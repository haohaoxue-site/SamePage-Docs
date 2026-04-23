import type { DocumentShareAccess, TiptapJsonContent } from '@haohaoxue/samepage-domain'
import type { SharedDocsSurfaceState } from '../typing'
import type { ActiveDocumentDetail } from '@/views/docs/typing'
import {
  collectDocumentAssetIds,
  hydrateDocumentAssetAttributes,
} from '@haohaoxue/samepage-shared'
import { ElMessage } from 'element-plus'
import { computed, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  acceptDocumentShare,
  acceptDocumentShareRecipient,
  declineDocumentShare,
  declineDocumentShareRecipient,
  getDocumentShareAccess,
  getDocumentShareRecipientAccess,
  getSharedDocumentHead,
  getSharedRecipientDocumentHead,
  resolveSharedDocumentAssets,
  resolveSharedRecipientDocumentAssets,
} from '@/apis/document-share'
import { getRequestErrorDisplayMessage } from '@/utils/request-error'
import { toActiveDocument } from '@/views/docs/composables/useActiveDocument'
import { buildDocumentEditorMeta } from '@/views/docs/utils/documentEditor'

interface SharedRouteContext {
  mode: 'share' | 'recipient'
  entryId: string
}

export function useSharedDocs() {
  const route = useRoute()
  let accessRequestId = 0
  let documentRequestId = 0
  const surfaceState = shallowRef<SharedDocsSurfaceState>('loading')
  const access = shallowRef<DocumentShareAccess | null>(null)
  const document = shallowRef<ActiveDocumentDetail | null>(null)
  const metadata = computed(() => buildDocumentEditorMeta({
    document: document.value,
    snapshots: document.value && access.value
      ? [{
          id: document.value.latestSnapshotId,
          documentId: document.value.id,
          revision: document.value.headRevision,
          schemaVersion: document.value.schemaVersion,
          title: document.value.title,
          body: document.value.body,
          source: 'autosave',
          restoredFromSnapshotId: null,
          createdAt: document.value.updatedAt,
          createdBy: access.value.share.createdBy,
          createdByUser: access.value.share.createdByUser,
        }]
      : [],
    fallbackUser: access.value?.share.createdByUser ?? null,
  }))
  const isActionPending = shallowRef(false)
  const errorMessage = shallowRef('')
  const routeMode = computed<'share' | 'recipient'>(() =>
    typeof route.params.recipientId === 'string' ? 'recipient' : 'share',
  )
  const routeEntryId = computed(() =>
    routeMode.value === 'recipient'
      ? (typeof route.params.recipientId === 'string' ? route.params.recipientId : '')
      : (typeof route.params.shareId === 'string' ? route.params.shareId : ''),
  )

  watch(
    [routeMode, routeEntryId],
    async () => {
      await reload()
    },
    {
      immediate: true,
    },
  )

  return {
    surfaceState,
    access,
    document,
    metadata,
    errorMessage,
    isActionPending,
    acceptShare,
    declineShare,
    reload,
  }

  async function reload() {
    const routeContext = resolveCurrentRouteContext()

    if (!routeContext) {
      accessRequestId += 1
      documentRequestId += 1
      access.value = null
      document.value = null
      errorMessage.value = ''
      surfaceState.value = 'invalid'
      return
    }

    const requestId = ++accessRequestId
    documentRequestId += 1
    surfaceState.value = 'loading'
    errorMessage.value = ''
    document.value = null

    await loadShareAccess(routeContext, requestId)
  }

  async function acceptShare() {
    const routeContext = resolveCurrentRouteContext()

    if (!routeContext || !access.value || isActionPending.value) {
      return
    }

    isActionPending.value = true

    try {
      const nextAccess = routeContext.mode === 'recipient'
        ? await acceptDocumentShareRecipient(routeContext.entryId)
        : await acceptDocumentShare(routeContext.entryId)

      if (!isSameRouteContext(routeContext)) {
        return
      }

      const requestId = ++accessRequestId
      access.value = nextAccess
      await syncSurfaceFromAccess(nextAccess, routeContext, requestId)
    }
    catch (error) {
      if (isSameRouteContext(routeContext)) {
        handleSurfaceError(error)
        ElMessage.error('接受分享失败，请稍后重试')
      }
    }
    finally {
      isActionPending.value = false
    }
  }

  async function declineShare() {
    const routeContext = resolveCurrentRouteContext()

    if (!routeContext || !access.value || isActionPending.value) {
      return
    }

    isActionPending.value = true

    try {
      const nextAccess = routeContext.mode === 'recipient'
        ? await declineDocumentShareRecipient(routeContext.entryId)
        : await declineDocumentShare(routeContext.entryId)

      if (!isSameRouteContext(routeContext)) {
        return
      }

      accessRequestId += 1
      access.value = nextAccess
      surfaceState.value = 'confirm'
    }
    catch (error) {
      if (isSameRouteContext(routeContext)) {
        handleSurfaceError(error)
        ElMessage.error('暂时无法更新分享状态，请稍后重试')
      }
    }
    finally {
      isActionPending.value = false
    }
  }

  async function loadShareAccess(routeContext: SharedRouteContext, requestId: number) {
    try {
      const nextAccess = routeContext.mode === 'recipient'
        ? await getDocumentShareRecipientAccess(routeContext.entryId)
        : await getDocumentShareAccess(routeContext.entryId)

      if (!isActiveAccessRequest(requestId, routeContext)) {
        return
      }

      access.value = nextAccess
      await syncSurfaceFromAccess(nextAccess, routeContext, requestId)
    }
    catch (error) {
      if (!isActiveAccessRequest(requestId, routeContext)) {
        return
      }

      access.value = null
      handleSurfaceError(error)
    }
  }

  async function syncSurfaceFromAccess(
    nextAccess: DocumentShareAccess,
    routeContext: SharedRouteContext,
    requestId: number,
  ) {
    if (!isActiveAccessRequest(requestId, routeContext)) {
      return
    }

    if (nextAccess.recipientStatus === 'ACTIVE') {
      const hasLoadedDocument = await loadSharedDocument(routeContext)

      if (!hasLoadedDocument || !isActiveAccessRequest(requestId, routeContext)) {
        return
      }

      surfaceState.value = 'reader'
      return
    }

    surfaceState.value = 'confirm'
  }

  async function loadSharedDocument(routeContext: SharedRouteContext) {
    const documentId = access.value?.documentId

    if (!documentId) {
      return false
    }

    const requestId = ++documentRequestId
    const documentHead = routeContext.mode === 'recipient'
      ? await getSharedRecipientDocumentHead(routeContext.entryId, documentId)
      : await getSharedDocumentHead(routeContext.entryId, documentId)

    if (!isActiveDocumentRequest(requestId, routeContext)) {
      return false
    }

    const resolvedBodies = await hydrateSharedBodies([documentHead.latestSnapshot.body], routeContext, requestId, documentId)

    if (!isActiveDocumentRequest(requestId, routeContext)) {
      return false
    }

    const nextDocument = toActiveDocument({
      ...documentHead,
      latestSnapshot: {
        ...documentHead.latestSnapshot,
        body: resolvedBodies[0] ?? documentHead.latestSnapshot.body,
      },
    })

    document.value = nextDocument
    return true
  }

  async function hydrateSharedBodies(
    bodies: TiptapJsonContent[],
    routeContext: SharedRouteContext,
    requestId: number,
    documentId: string,
  ) {
    const assetIds = Array.from(new Set(bodies.flatMap(body => collectDocumentAssetIds(body))))

    if (!assetIds.length) {
      return bodies
    }

    const resolvedAssets = routeContext.mode === 'recipient'
      ? await resolveSharedRecipientDocumentAssets(routeContext.entryId, documentId, {
          assetIds,
        })
      : await resolveSharedDocumentAssets(routeContext.entryId, documentId, {
          assetIds,
        })

    if (!isActiveDocumentRequest(requestId, routeContext)) {
      return bodies
    }

    const assetsById = Object.fromEntries(
      resolvedAssets.assets.map(asset => [asset.id, asset]),
    )

    return bodies.map(body => hydrateDocumentAssetAttributes(body, assetsById))
  }

  function handleSurfaceError(error: unknown) {
    const requestError = error as Error & { status?: number }

    if (requestError.status === 404) {
      surfaceState.value = 'invalid'
      errorMessage.value = getRequestErrorDisplayMessage(error, '该分享暂时不可用')
      return
    }

    if (requestError.status === 403) {
      surfaceState.value = 'invalid'
      errorMessage.value = getRequestErrorDisplayMessage(error, '这次分享不属于你')
      return
    }

    surfaceState.value = 'error'
    errorMessage.value = '暂时无法加载分享文档，请稍后重试'
  }

  function resolveCurrentRouteContext(): SharedRouteContext | null {
    if (!routeEntryId.value) {
      return null
    }

    return {
      mode: routeMode.value,
      entryId: routeEntryId.value,
    }
  }

  function isSameRouteContext(routeContext: SharedRouteContext) {
    return routeMode.value === routeContext.mode && routeEntryId.value === routeContext.entryId
  }

  function isActiveAccessRequest(requestId: number, routeContext: SharedRouteContext) {
    return requestId === accessRequestId && isSameRouteContext(routeContext)
  }

  function isActiveDocumentRequest(requestId: number, routeContext: SharedRouteContext) {
    return requestId === documentRequestId && isSameRouteContext(routeContext)
  }
}
