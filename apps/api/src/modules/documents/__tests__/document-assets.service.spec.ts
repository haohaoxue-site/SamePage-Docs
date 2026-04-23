import type { JwtConfig } from '../../../config/auth.config'
import { Buffer } from 'node:buffer'
import { describe, expect, it, vi } from 'vitest'
import { DocumentAssetsService } from '../document-assets.service'

function createPrismaMock() {
  return {
    documentAsset: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
  }
}

function createStorageServiceMock() {
  return {
    putObject: vi.fn(),
    getObject: vi.fn(),
  }
}

function createDocumentAccessServiceMock() {
  return {
    assertCanEditDocument: vi.fn(),
    assertCanReadDocument: vi.fn(),
  }
}

function createDocumentShareRecipientsServiceMock() {
  return {
    assertCanReadSharedDocument: vi.fn(),
    assertCanReadSharedRecipientDocument: vi.fn(),
  }
}

function createConfigServiceMock() {
  return {
    getOrThrow: vi.fn((_key: string): JwtConfig => ({
      accessSecret: 'samepage-test-secret',
      issuer: 'samepage',
      audience: 'samepage-web',
      accessTtlSeconds: 15 * 60,
      refreshTtlSeconds: 30 * 24 * 60 * 60,
    })),
  }
}

function createPersistedAsset(overrides: Partial<{
  id: string
  documentId: string
  kind: 'IMAGE' | 'FILE'
  status: 'READY'
  mimeType: string
  size: number
  originalFileName: string
  width: number | null
  height: number | null
  createdAt: Date
  bucket: string
  objectKey: string
}> = {}) {
  return {
    id: 'asset_1',
    documentId: 'doc_1',
    kind: 'FILE' as const,
    status: 'READY' as const,
    mimeType: 'application/pdf',
    size: 12,
    originalFileName: 'spec.pdf',
    width: null,
    height: null,
    createdAt: new Date('2026-04-15T00:00:00.000Z'),
    bucket: 'document-asset',
    objectKey: 'documents/doc_1/asset_1.pdf',
    ...overrides,
  }
}

describe('documentAssetsService', () => {
  it('uploadFile 会写入文档附件资源并返回 file 资产 DTO', async () => {
    const prisma = createPrismaMock()
    const storageService = createStorageServiceMock()
    const documentAccessService = createDocumentAccessServiceMock()
    const documentShareRecipientsService = createDocumentShareRecipientsServiceMock()
    prisma.documentAsset.create.mockResolvedValue({
      id: 'asset_file_1',
      documentId: 'doc_1',
      kind: 'FILE',
      status: 'READY',
      mimeType: 'application/pdf',
      size: 12,
      originalFileName: 'spec.pdf',
      width: null,
      height: null,
      createdAt: new Date('2026-04-15T00:00:00.000Z'),
      bucket: 'document-asset',
      objectKey: 'documents/doc_1/asset_file_1.pdf',
    })

    const service = new DocumentAssetsService(
      prisma as never,
      storageService as never,
      documentAccessService as never,
      documentShareRecipientsService as never,
      createConfigServiceMock() as never,
    )

    const result = await service.uploadFile({
      actorId: 'user_1',
      documentId: 'doc_1',
      fileName: 'spec.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake pdf body'),
    })

    expect(documentAccessService.assertCanEditDocument).toHaveBeenCalledWith('user_1', 'doc_1')
    expect(storageService.putObject).toHaveBeenCalledWith(expect.objectContaining({
      bucket: 'document-asset',
      contentType: 'application/pdf',
      contentLength: 13,
      contentDisposition: {
        type: 'attachment',
        fileName: 'spec.pdf',
        fallbackFileName: 'attachment',
      },
    }))
    expect(prisma.documentAsset.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        documentId: 'doc_1',
        kind: 'FILE',
        status: 'READY',
        mimeType: 'application/pdf',
        originalFileName: 'spec.pdf',
        createdBy: 'user_1',
      }),
    }))
    expect(result).toEqual(expect.objectContaining({
      id: 'asset_file_1',
      documentId: 'doc_1',
      kind: 'file',
      status: 'ready',
      mimeType: 'application/pdf',
      fileName: 'spec.pdf',
    }))
  })

  it('resolveAssets 会按请求中的 assetIds 顺序返回资源', async () => {
    const prisma = createPrismaMock()
    const storageService = createStorageServiceMock()
    const documentAccessService = createDocumentAccessServiceMock()
    const documentShareRecipientsService = createDocumentShareRecipientsServiceMock()
    prisma.documentAsset.findMany.mockResolvedValue([
      createPersistedAsset({
        id: 'asset_1',
        documentId: 'doc_1',
        objectKey: 'documents/doc_1/asset_1.pdf',
      }),
      createPersistedAsset({
        id: 'asset_2',
        documentId: 'doc_1',
        objectKey: 'documents/doc_1/asset_2.pdf',
      }),
    ])
    const service = new DocumentAssetsService(
      prisma as never,
      storageService as never,
      documentAccessService as never,
      documentShareRecipientsService as never,
      createConfigServiceMock() as never,
    )

    const result = await service.resolveAssets({
      actorId: 'user_1',
      documentId: 'doc_1',
      assetIds: ['asset_2', 'asset_1', 'asset_missing', 'asset_2'],
    })

    expect(result.unresolvedAssetIds).toEqual(['asset_missing'])
    expect(result.assets.map(asset => asset.id)).toEqual(['asset_2', 'asset_1'])
    expect(result.assets[0]?.contentUrl).toMatch(/^\/api\/documents\/doc_1\/assets\/asset_2\/content\?token=/)
  })

  it('resolveSharedAssets 会按请求中的 assetIds 顺序返回 share 资源', async () => {
    const prisma = createPrismaMock()
    const storageService = createStorageServiceMock()
    const documentAccessService = createDocumentAccessServiceMock()
    const documentShareRecipientsService = createDocumentShareRecipientsServiceMock()
    documentShareRecipientsService.assertCanReadSharedDocument.mockResolvedValue({
      documentId: 'doc_share_1',
    })
    prisma.documentAsset.findMany.mockResolvedValue([
      createPersistedAsset({
        id: 'asset_share_1',
        documentId: 'doc_share_1',
        objectKey: 'documents/doc_share_1/asset_share_1.pdf',
      }),
      createPersistedAsset({
        id: 'asset_share_2',
        documentId: 'doc_share_1',
        objectKey: 'documents/doc_share_1/asset_share_2.pdf',
      }),
    ])
    const service = new DocumentAssetsService(
      prisma as never,
      storageService as never,
      documentAccessService as never,
      documentShareRecipientsService as never,
      createConfigServiceMock() as never,
    )

    const result = await service.resolveSharedAssets({
      actorId: 'user_1',
      shareId: 'share_1',
      documentId: 'doc_share_1',
      assetIds: ['asset_share_2', 'asset_share_1'],
    })

    expect(result.assets.map(asset => asset.id)).toEqual(['asset_share_2', 'asset_share_1'])
    expect(result.assets[0]?.contentUrl).toMatch(/^\/api\/document-shares\/share_1\/documents\/doc_share_1\/assets\/asset_share_2\/content\?token=/)
  })

  it('resolveSharedRecipientAssets 会按请求中的 assetIds 顺序返回 recipient 资源', async () => {
    const prisma = createPrismaMock()
    const storageService = createStorageServiceMock()
    const documentAccessService = createDocumentAccessServiceMock()
    const documentShareRecipientsService = createDocumentShareRecipientsServiceMock()
    documentShareRecipientsService.assertCanReadSharedRecipientDocument.mockResolvedValue({
      documentId: 'doc_recipient_1',
    })
    prisma.documentAsset.findMany.mockResolvedValue([
      createPersistedAsset({
        id: 'asset_recipient_1',
        documentId: 'doc_recipient_1',
        objectKey: 'documents/doc_recipient_1/asset_recipient_1.pdf',
      }),
      createPersistedAsset({
        id: 'asset_recipient_2',
        documentId: 'doc_recipient_1',
        objectKey: 'documents/doc_recipient_1/asset_recipient_2.pdf',
      }),
    ])
    const service = new DocumentAssetsService(
      prisma as never,
      storageService as never,
      documentAccessService as never,
      documentShareRecipientsService as never,
      createConfigServiceMock() as never,
    )

    const result = await service.resolveSharedRecipientAssets({
      actorId: 'user_1',
      recipientId: 'recipient_1',
      documentId: 'doc_recipient_1',
      assetIds: ['asset_recipient_2', 'asset_recipient_1'],
    })

    expect(result.assets.map(asset => asset.id)).toEqual(['asset_recipient_2', 'asset_recipient_1'])
    expect(result.assets[0]?.contentUrl).toMatch(/^\/api\/document-share-recipients\/recipient_1\/documents\/doc_recipient_1\/assets\/asset_recipient_2\/content\?token=/)
  })
})
