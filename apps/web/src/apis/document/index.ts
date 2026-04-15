import type {
  CreateDocumentDto,
  CreateDocumentResponseDto,
  CreateDocumentSnapshotDto,
  CreateDocumentSnapshotResponseDto,
  DocumentDto,
  DocumentHeadDto,
  DocumentRecentDto,
  DocumentSnapshotDto,
  PatchDocumentMetaDto,
  RestoreDocumentSnapshotDto,
} from './typing'
import { axios } from '@/utils/axios'

export * from './typing'

export function getDocuments(): Promise<DocumentDto> {
  return axios.request({
    method: 'get',
    url: '/documents',
  })
}

export function createDocument(data: CreateDocumentDto): Promise<CreateDocumentResponseDto> {
  return axios.request({
    method: 'post',
    url: '/documents',
    data,
  })
}

export function getRecentDocuments(): Promise<DocumentRecentDto[]> {
  return axios.request({
    method: 'get',
    url: '/documents/recent',
  })
}

export function getDocumentHead(id: string): Promise<DocumentHeadDto> {
  return axios.request({
    method: 'get',
    url: `/documents/${id}`,
  })
}

export function createDocumentSnapshot(
  id: string,
  data: CreateDocumentSnapshotDto,
): Promise<CreateDocumentSnapshotResponseDto> {
  return axios.request({
    method: 'post',
    url: `/documents/${id}/snapshots`,
    data,
  })
}

export function getDocumentSnapshots(id: string): Promise<DocumentSnapshotDto[]> {
  return axios.request({
    method: 'get',
    url: `/documents/${id}/snapshots`,
  })
}

export function restoreDocumentSnapshot(
  id: string,
  data: RestoreDocumentSnapshotDto,
): Promise<CreateDocumentSnapshotResponseDto> {
  return axios.request({
    method: 'post',
    url: `/documents/${id}/restore`,
    data,
  })
}

export function patchDocumentMeta(id: string, data: PatchDocumentMetaDto): Promise<DocumentHeadDto> {
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
