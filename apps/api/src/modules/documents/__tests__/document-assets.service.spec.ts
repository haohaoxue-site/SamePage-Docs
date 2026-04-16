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

describe('documentAssetsService', () => {
  it('uploadFile 会写入文档附件资源并返回 file 资产 DTO', async () => {
    const prisma = createPrismaMock()
    const storageService = createStorageServiceMock()
    const documentAccessService = createDocumentAccessServiceMock()
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
})
