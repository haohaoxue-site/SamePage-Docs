import type {
  DocumentHead,
  DocumentShareAccess,
} from '@haohaoxue/samepage-domain'
import type { FastifyReply } from 'fastify'
import type { AuthUserContext } from '../auth/auth.interface'
import { ResolveDocumentAssetsSchema } from '@haohaoxue/samepage-contracts'
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common'
import {
  CurrentUser,
} from '../../decorators/current-user.decorator'
import { Public } from '../../decorators/public.decorator'
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe'
import { DocumentAssetsService } from './document-assets.service'
import { DocumentShareRecipientsService } from './document-share-recipients.service'

@Controller('document-shares')
export class DocumentSharesController {
  constructor(
    private readonly documentShareRecipientsService: DocumentShareRecipientsService,
    private readonly documentAssetsService: DocumentAssetsService,
  ) {}

  @Get(':shareId')
  async getShareAccess(
    @CurrentUser() authUser: AuthUserContext,
    @Param('shareId') shareId: string,
  ): Promise<DocumentShareAccess> {
    return this.documentShareRecipientsService.getShareAccess(authUser.id, shareId)
  }

  @Post(':shareId/accept')
  async acceptShare(
    @CurrentUser() authUser: AuthUserContext,
    @Param('shareId') shareId: string,
  ): Promise<DocumentShareAccess> {
    return this.documentShareRecipientsService.acceptShare(authUser.id, shareId)
  }

  @Post(':shareId/decline')
  async declineShare(
    @CurrentUser() authUser: AuthUserContext,
    @Param('shareId') shareId: string,
  ): Promise<DocumentShareAccess> {
    return this.documentShareRecipientsService.declineShare(authUser.id, shareId)
  }

  @Get(':shareId/documents/:documentId')
  async getSharedDocumentHead(
    @CurrentUser() authUser: AuthUserContext,
    @Param('shareId') shareId: string,
    @Param('documentId') documentId: string,
  ): Promise<DocumentHead> {
    return this.documentShareRecipientsService.getSharedDocumentHead(authUser.id, shareId, documentId)
  }

  @Post(':shareId/documents/:documentId/assets/resolve')
  async resolveSharedDocumentAssets(
    @CurrentUser() authUser: AuthUserContext,
    @Param('shareId') shareId: string,
    @Param('documentId') documentId: string,
    @Body(new ZodValidationPipe(ResolveDocumentAssetsSchema)) payload: { assetIds: string[] },
  ) {
    return this.documentAssetsService.resolveSharedAssets({
      actorId: authUser.id,
      shareId,
      documentId,
      assetIds: payload.assetIds,
    })
  }

  @Public()
  @Get(':shareId/documents/:documentId/assets/:assetId/content')
  async getSharedDocumentAssetContent(
    @Param('shareId') shareId: string,
    @Param('documentId') documentId: string,
    @Param('assetId') assetId: string,
    @Query('token') token: string,
    @Res() response: FastifyReply,
  ): Promise<FastifyReply> {
    const asset = await this.documentAssetsService.getSharedAssetContent({
      shareId,
      documentId,
      assetId,
      token,
    })

    response.header('cache-control', 'private, max-age=300')
    response.header('content-type', asset.contentType)

    if (asset.contentLength !== null) {
      response.header('content-length', String(asset.contentLength))
    }

    return response.send(asset.body)
  }
}
