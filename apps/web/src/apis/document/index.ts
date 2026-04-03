import type {
  CreateDocumentDto,
  CreateDocumentResponseDto,
  DocumentDetailDto,
  DocumentDto,
  DocumentRecentDto,
  UpdateDocumentDto,
  UpdateDocumentResponseDto,
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

export function getDocumentById(id: string): Promise<DocumentDetailDto> {
  return axios.request({
    method: 'get',
    url: `/documents/${id}`,
  })
}

export function updateDocument(id: string, data: UpdateDocumentDto): Promise<UpdateDocumentResponseDto> {
  return axios.request({
    method: 'patch',
    url: `/documents/${id}`,
    data,
  })
}

export function deleteDocument(id: string): Promise<null> {
  return axios.request({
    method: 'delete',
    url: `/documents/${id}`,
  })
}
