import { describe, expect, it, vi } from 'vitest'
import { DocumentShareRecipientsController } from '../document-share-recipients.controller'
import { DocumentSharesController } from '../document-shares.controller'

function createAuthUser() {
  return {
    id: 'viewer-1',
  }
}

function createDocumentShareRecipientsServiceMock() {
  return {
    getSharedDocumentHead: vi.fn(),
    getSharedRecipientDocumentHead: vi.fn(),
  }
}

function createDocumentAssetsServiceMock() {
  return {
    resolveSharedAssets: vi.fn(),
    resolveSharedRecipientAssets: vi.fn(),
  }
}

describe('document share read routes', () => {
  it('public 共享阅读路由会把目标 documentId 传给 service', async () => {
    const recipientsService = createDocumentShareRecipientsServiceMock()
    const assetsService = createDocumentAssetsServiceMock()
    recipientsService.getSharedDocumentHead.mockResolvedValue({ document: { id: 'doc-child-1' } })
    const controller = new DocumentSharesController(recipientsService as never, assetsService as never)

    await controller.getSharedDocumentHead(createAuthUser() as never, 'share-parent-public', 'doc-child-1')

    expect(recipientsService.getSharedDocumentHead).toHaveBeenCalledWith(
      'viewer-1',
      'share-parent-public',
      'doc-child-1',
    )
  })

  it('direct recipient 共享阅读路由会把目标 documentId 传给 service', async () => {
    const recipientsService = createDocumentShareRecipientsServiceMock()
    const assetsService = createDocumentAssetsServiceMock()
    recipientsService.getSharedRecipientDocumentHead.mockResolvedValue({ document: { id: 'doc-child-1' } })
    const controller = new DocumentShareRecipientsController(recipientsService as never, assetsService as never)

    await controller.getSharedRecipientDocumentHead(createAuthUser() as never, 'recipient-parent-direct', 'doc-child-1')

    expect(recipientsService.getSharedRecipientDocumentHead).toHaveBeenCalledWith(
      'viewer-1',
      'recipient-parent-direct',
      'doc-child-1',
    )
  })
})
