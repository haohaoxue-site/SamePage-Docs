import type {
  CreateDirectDocumentShareRequest,
  CreateDocumentRequest,
  CreateDocumentResponse,
  CreateDocumentSnapshotRequest,
  CreateDocumentSnapshotResponse,
  DocumentAsset,
  DocumentHead,
  DocumentPublicShareInfo,
  DocumentRecent,
  DocumentShareRecipientSummary,
  DocumentSnapshot,
  DocumentTrashItem,
  DocumentTreeGroup,
  PatchDocumentMetaRequest,
  ResolveDocumentAssetsRequest,
  ResolveDocumentAssetsResponse,
  RestoreDocumentSnapshotRequest,
} from '@haohaoxue/samepage-domain'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AuthUserContext } from '../auth/auth.interface'
import {
  ConfirmDocumentShareInheritanceUnlinkSchema,
  CreateDirectDocumentShareSchema,
  CreateDocumentSchema,
  CreateDocumentSnapshotSchema,
  PatchDocumentMetaSchema,
  ResolveDocumentAssetsSchema,
  RestoreDocumentSnapshotSchema,
} from '@haohaoxue/samepage-contracts'
import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res } from '@nestjs/common'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { Public } from '../../decorators/public.decorator'
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe'
import { getRequestFile } from '../../utils/request-file'
import { DocumentAssetsService } from './document-assets.service'
import { DocumentSharesService } from './document-shares.service'
import { DocumentSnapshotsService } from './document-snapshots.service'
import { DocumentTrashService } from './document-trash.service'
import { DocumentsService } from './documents.service'

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly documentAssetsService: DocumentAssetsService,
    private readonly documentSharesService: DocumentSharesService,
    private readonly documentSnapshotsService: DocumentSnapshotsService,
    private readonly documentTrashService: DocumentTrashService,
  ) {}

  @Post()
  async createDocument(
    @CurrentUser() authUser: AuthUserContext,
    @Body(new ZodValidationPipe(CreateDocumentSchema)) payload: CreateDocumentRequest,
  ): Promise<CreateDocumentResponse> {
    return this.documentsService.createDocument(authUser.id, payload)
  }

  @Get()
  async getDocumentTree(
    @CurrentUser() authUser: AuthUserContext,
    @Query('workspaceId') workspaceId: string,
  ): Promise<DocumentTreeGroup[]> {
    if (!workspaceId?.trim()) {
      throw new BadRequestException('缺少 workspaceId')
    }

    return this.documentsService.getDocumentTree(authUser.id, workspaceId.trim())
  }

  @Get('recent')
  async getRecentDocuments(@CurrentUser() authUser: AuthUserContext): Promise<DocumentRecent[]> {
    return this.documentsService.getRecentDocuments(authUser.id)
  }

  @Get('trash')
  async getTrashDocuments(
    @CurrentUser() authUser: AuthUserContext,
    @Query('workspaceId') workspaceId: string,
  ): Promise<DocumentTrashItem[]> {
    if (!workspaceId?.trim()) {
      throw new BadRequestException('缺少 workspaceId')
    }

    return this.documentTrashService.getTrashDocuments(authUser.id, workspaceId.trim())
  }

  @Get(':id/shares/public')
  async getPublicShare(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
  ): Promise<DocumentPublicShareInfo> {
    return this.documentSharesService.getPublicShare(authUser.id, id)
  }

  @Post(':id/shares/public')
  async enablePublicShare(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ConfirmDocumentShareInheritanceUnlinkSchema)) payload: { confirmUnlinkInheritance?: boolean },
  ): Promise<DocumentPublicShareInfo> {
    return this.documentSharesService.enablePublicShare(authUser.id, id, payload)
  }

  @Delete(':id/shares/public')
  async revokePublicShare(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
  ): Promise<null> {
    return this.documentSharesService.revokePublicShare(authUser.id, id)
  }

  @Get(':id/shares/direct')
  async getDirectShares(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
  ): Promise<DocumentShareRecipientSummary[]> {
    return this.documentSharesService.getDirectShares(authUser.id, id)
  }

  @Post(':id/shares/direct')
  async createDirectShare(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateDirectDocumentShareSchema)) payload: CreateDirectDocumentShareRequest,
  ): Promise<DocumentShareRecipientSummary> {
    return this.documentSharesService.createDirectShare(authUser.id, id, payload)
  }

  @Delete(':id/shares/direct/:recipientId')
  async revokeDirectShare(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
    @Param('recipientId') recipientId: string,
  ): Promise<null> {
    return this.documentSharesService.revokeDirectShare(authUser.id, id, recipientId)
  }

  @Post(':id/shares/none')
  async setNoSharePolicy(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ConfirmDocumentShareInheritanceUnlinkSchema)) payload: { confirmUnlinkInheritance?: boolean },
  ): Promise<null> {
    return this.documentSharesService.setNoSharePolicy(authUser.id, id, payload)
  }

  @Delete(':id/shares/local-policy')
  async restoreInheritedSharePolicy(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
  ): Promise<null> {
    return this.documentSharesService.restoreInheritedPolicy(authUser.id, id)
  }

  @Get(':id')
  async getDocumentHead(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
    @Query('recordVisit') recordVisit: string | undefined,
  ): Promise<DocumentHead> {
    return this.documentSnapshotsService.getDocumentHead(authUser.id, id, {
      recordVisit: recordVisit === '1' || recordVisit === 'true',
    })
  }

  @Post(':id/snapshots')
  async createDocumentSnapshot(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateDocumentSnapshotSchema)) payload: CreateDocumentSnapshotRequest,
  ): Promise<CreateDocumentSnapshotResponse> {
    return this.documentSnapshotsService.createDocumentSnapshot(authUser.id, id, payload)
  }

  @Get(':id/snapshots')
  async getDocumentSnapshots(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
  ): Promise<DocumentSnapshot[]> {
    return this.documentSnapshotsService.getDocumentSnapshots(authUser.id, id)
  }

  @Post(':id/restore')
  async restoreDocumentSnapshot(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RestoreDocumentSnapshotSchema)) payload: RestoreDocumentSnapshotRequest,
  ): Promise<CreateDocumentSnapshotResponse> {
    return this.documentSnapshotsService.restoreDocumentSnapshot(authUser.id, id, payload)
  }

  @Patch(':id/meta')
  async patchDocumentMeta(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(PatchDocumentMetaSchema)) payload: PatchDocumentMetaRequest,
  ): Promise<DocumentHead> {
    return this.documentsService.patchDocumentMeta(authUser.id, id, payload)
  }

  @Delete(':id')
  async deleteDocument(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
  ): Promise<null> {
    await this.documentTrashService.deleteDocument(authUser.id, id)
    return null
  }

  @Post(':id/restore-from-trash')
  async restoreDocumentFromTrash(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
  ): Promise<null> {
    await this.documentTrashService.restoreDocumentFromTrash(authUser.id, id)
    return null
  }

  @Delete(':id/permanent')
  async permanentlyDeleteDocument(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
  ): Promise<null> {
    await this.documentTrashService.permanentlyDeleteDocument(authUser.id, id)
    return null
  }

  @Post(':id/assets/images')
  async uploadDocumentImage(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
    @Req() request: FastifyRequest,
  ): Promise<DocumentAsset> {
    const file = await getRequestFile(request)

    if (!file) {
      throw new BadRequestException('请选择图片文件')
    }

    return this.documentAssetsService.uploadImage({
      actorId: authUser.id,
      documentId: id,
      fileName: file.filename,
      mimeType: file.mimetype,
      buffer: await file.toBuffer(),
    })
  }

  @Post(':id/assets/files')
  async uploadDocumentFile(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
    @Req() request: FastifyRequest,
  ): Promise<DocumentAsset> {
    const file = await getRequestFile(request)

    if (!file) {
      throw new BadRequestException('请选择附件文件')
    }

    return this.documentAssetsService.uploadFile({
      actorId: authUser.id,
      documentId: id,
      fileName: file.filename,
      mimeType: file.mimetype,
      buffer: await file.toBuffer(),
    })
  }

  @Post(':id/assets/resolve')
  async resolveDocumentAssets(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ResolveDocumentAssetsSchema)) payload: ResolveDocumentAssetsRequest,
  ): Promise<ResolveDocumentAssetsResponse> {
    return this.documentAssetsService.resolveAssets({
      actorId: authUser.id,
      documentId: id,
      assetIds: payload.assetIds,
    })
  }

  @Public()
  @Get(':id/assets/:assetId/content')
  async getDocumentAssetContent(
    @Param('id') id: string,
    @Param('assetId') assetId: string,
    @Query('token') token: string,
    @Res() response: FastifyReply,
  ): Promise<FastifyReply> {
    const asset = await this.documentAssetsService.getAssetContent({
      documentId: id,
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
