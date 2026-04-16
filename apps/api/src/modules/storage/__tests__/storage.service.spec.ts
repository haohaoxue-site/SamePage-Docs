import { Buffer } from 'node:buffer'
import { describe, expect, it, vi } from 'vitest'
import { StorageService } from '../storage.service'

function createConfigServiceMock() {
  return {
    getOrThrow: vi.fn(() => ({
      endpoint: 'http://127.0.0.1:9000',
      region: 'auto',
      accessKey: 'samepage-access-key',
      secretKey: 'samepage-secret-key',
      forcePathStyle: true,
    })),
  }
}

describe('storageService', () => {
  it('putObject 会把语义化 contentDisposition 组装为对象存储 header', async () => {
    const service = new StorageService(createConfigServiceMock() as never)
    const send = vi.fn().mockResolvedValue(undefined)

    vi.spyOn(service, 'ensureBucket').mockResolvedValue(undefined)
    Reflect.set(service as object, 'client', { send })

    await service.putObject({
      bucket: 'document-asset',
      key: 'documents/doc_1/asset_1.pdf',
      body: Buffer.from('fake body'),
      contentType: 'application/pdf',
      contentDisposition: {
        type: 'attachment',
        fileName: 'spec".pdf',
        fallbackFileName: 'attachment',
      },
    })

    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      input: expect.objectContaining({
        Bucket: 'document-asset',
        Key: 'documents/doc_1/asset_1.pdf',
        ContentDisposition: 'attachment; filename="spec.pdf"',
      }),
    }))
  })
})
