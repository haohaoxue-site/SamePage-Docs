import type {
  CreateDocumentRequest,
  CreateDocumentResponse,
  CreateDocumentSnapshotRequest,
  CreateDocumentSnapshotResponse,
  DocumentAsset,
  DocumentHead,
  DocumentRecent,
  DocumentSnapshot,
  DocumentTreeGroup,
  PatchDocumentMetaRequest,
  ResolveDocumentAssetsRequest,
  ResolveDocumentAssetsResponse,
  RestoreDocumentSnapshotRequest,
} from './typing'
import { axios } from '@/utils/axios'

export * from './typing'

export function getDocuments(): Promise<DocumentTreeGroup[]> {
  return axios.request({
    method: 'get',
    url: '/documents',
  })
}

export function createDocument(data: CreateDocumentRequest): Promise<CreateDocumentResponse> {
  return axios.request({
    method: 'post',
    url: '/documents',
    data,
  })
}

export function getRecentDocuments(): Promise<DocumentRecent[]> {
  return axios.request({
    method: 'get',
    url: '/documents/recent',
  })
}

export function getDocumentHead(id: string): Promise<DocumentHead> {
  return axios.request({
    method: 'get',
    url: `/documents/${id}`,
  })
}

export function createDocumentSnapshot(
  id: string,
  data: CreateDocumentSnapshotRequest,
): Promise<CreateDocumentSnapshotResponse> {
  return axios.request({
    method: 'post',
    url: `/documents/${id}/snapshots`,
    data,
  })
}

export function getDocumentSnapshots(id: string): Promise<DocumentSnapshot[]> {
  return axios.request({
    method: 'get',
    url: `/documents/${id}/snapshots`,
  })
}

export function restoreDocumentSnapshot(
  id: string,
  data: RestoreDocumentSnapshotRequest,
): Promise<CreateDocumentSnapshotResponse> {
  return axios.request({
    method: 'post',
    url: `/documents/${id}/restore`,
    data,
  })
}

export function patchDocumentMeta(id: string, data: PatchDocumentMetaRequest): Promise<DocumentHead> {
  return axios.request({
    method: 'patch',
    url: `/documents/${id}/meta`,
    data,
  })
}

export function deleteDocument(id: string): Promise<null> {
  return axios.request({
    method: 'delete',
    url: `/documents/${id}`,
  })
}

export function uploadDocumentImage(id: string, file: File): Promise<DocumentAsset> {
  const data = new FormData()
  data.append('file', file)

  return axios.request({
    method: 'post',
    url: `/documents/${id}/assets/images`,
    data,
  })
}

export function uploadDocumentFile(id: string, file: File): Promise<DocumentAsset> {
  const data = new FormData()
  data.append('file', file)

  return axios.request({
    method: 'post',
    url: `/documents/${id}/assets/files`,
    data,
  })
}

export function resolveDocumentAssets(
  id: string,
  data: ResolveDocumentAssetsRequest,
): Promise<ResolveDocumentAssetsResponse> {
  return axios.request({
    method: 'post',
    url: `/documents/${id}/assets/resolve`,
    data,
  })
}
