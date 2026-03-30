import type {
  CreateDocumentNodeDto,
  CreateDocumentNodeResponseDto,
  DocumentBaseDto,
  DocumentNodeDetailDto,
  DocumentTreeDto,
  SaveDocumentNodeDto,
  SaveDocumentNodeResponseDto,
} from './typing'
import { axios } from '@/utils/axios'

export * from './typing'

export function getDocumentTree(): Promise<DocumentTreeDto> {
  return axios.request({
    method: 'get',
    url: '/document-tree',
  })
}

export function createDocumentNode(data: CreateDocumentNodeDto): Promise<CreateDocumentNodeResponseDto> {
  return axios.request({
    method: 'post',
    url: '/document-tree',
    data,
  })
}

export function listRecentDocumentNodes(): Promise<DocumentBaseDto[]> {
  return axios.request({
    method: 'get',
    url: '/document-tree/recent',
  })
}

export function getDocumentNodeById(id: string): Promise<DocumentNodeDetailDto> {
  return axios.request({
    method: 'get',
    url: `/document-tree/${id}`,
  })
}

export function saveDocumentNode(id: string, data: SaveDocumentNodeDto): Promise<SaveDocumentNodeResponseDto> {
  return axios.request({
    method: 'patch',
    url: `/document-tree/${id}`,
    data,
  })
}

export function deleteDocumentNode(id: string): Promise<null> {
  return axios.request({
    method: 'delete',
    url: `/document-tree/${id}`,
  })
}
