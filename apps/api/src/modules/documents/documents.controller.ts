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
} from '@haohaoxue/samepage-domain'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AuthUserContext } from '../auth/auth.interface'
import {
  CreateDocumentSchema,
  CreateDocumentSnapshotSchema,
  PatchDocumentMetaSchema,
  ResolveDocumentAssetsSchema,
  RestoreDocumentSnapshotSchema,
} from '@haohaoxue/samepage-contracts'
import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res } from '@nestjs/common'
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { Public } from '../../decorators/public.decorator'
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe'
import { ApiRequestResponse } from '../../utils/swagger'
import { DocumentAssetsService } from './document-assets.service'
import {
  createDocumentRequestApiSchema,
  createDocumentResponseApiSchema,
  createDocumentSnapshotRequestApiSchema,
  createDocumentSnapshotResponseApiSchema,
  documentAssetApiSchema,
  patchDocumentMetaRequestApiSchema,
  resolveDocumentAssetsRequestApiSchema,
  resolveDocumentAssetsResponseApiSchema,
  restoreDocumentSnapshotRequestApiSchema,
} from './documents.constants'
import { DocumentsService } from './documents.service'

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly documentAssetsService: DocumentAssetsService,
  ) {}

  @ApiOperation({ summary: '创建文档' })
  @ApiBody({ schema: createDocumentRequestApiSchema })
  @ApiRequestResponse(createDocumentResponseApiSchema)
  @Post()
  async createDocument(
    @CurrentUser() authUser: AuthUserContext,
    @Body(new ZodValidationPipe(CreateDocumentSchema)) payload: CreateDocumentRequest,
  ): Promise<CreateDocumentResponse> {
    return this.documentsService.createDocument(authUser.id, payload)
  }

  @ApiOperation({ summary: '获取当前用户可见的文档树' })
  @ApiRequestResponse([{ type: 'object' }])
  @Get()
  async getDocumentTree(@CurrentUser() authUser: AuthUserContext): Promise<DocumentTreeGroup[]> {
    return this.documentsService.getDocumentTree(authUser.id)
  }

  @ApiOperation({ summary: '获取最近文档' })
  @ApiRequestResponse([{ type: 'object' }])
  @Get('recent')
  async getRecentDocuments(@CurrentUser() authUser: AuthUserContext): Promise<DocumentRecent[]> {
    return this.documentsService.getRecentDocuments(authUser.id)
  }

  @ApiOperation({ summary: '获取文档当前 head' })
  @ApiRequestResponse({ type: 'object' })
  @Get(':id')
  async getDocumentHead(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
  ): Promise<DocumentHead> {
    return this.documentsService.getDocumentHead(authUser.id, id)
  }

  @ApiOperation({ summary: '创建文档 snapshot' })
  @ApiBody({ schema: createDocumentSnapshotRequestApiSchema })
  @ApiRequestResponse(createDocumentSnapshotResponseApiSchema)
  @Post(':id/snapshots')
  async createDocumentSnapshot(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateDocumentSnapshotSchema)) payload: CreateDocumentSnapshotRequest,
  ): Promise<CreateDocumentSnapshotResponse> {
    return this.documentsService.createDocumentSnapshot(authUser.id, id, payload)
  }

  @ApiOperation({ summary: '获取文档 snapshot 列表' })
  @ApiRequestResponse([{ type: 'object' }])
  @Get(':id/snapshots')
  async getDocumentSnapshots(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
  ): Promise<DocumentSnapshot[]> {
    return this.documentsService.getDocumentSnapshots(authUser.id, id)
  }

  @ApiOperation({ summary: '恢复文档 snapshot' })
  @ApiBody({ schema: restoreDocumentSnapshotRequestApiSchema })
  @ApiRequestResponse(createDocumentSnapshotResponseApiSchema)
  @Post(':id/restore')
  async restoreDocumentSnapshot(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RestoreDocumentSnapshotSchema)) payload: RestoreDocumentSnapshotRequest,
  ): Promise<CreateDocumentSnapshotResponse> {
    return this.documentsService.restoreDocumentSnapshot(authUser.id, id, payload)
  }

  @ApiOperation({ summary: '更新文档元数据' })
  @ApiBody({ schema: patchDocumentMetaRequestApiSchema })
  @ApiRequestResponse({ type: 'object' })
  @Patch(':id/meta')
  async patchDocumentMeta(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(PatchDocumentMetaSchema)) payload: PatchDocumentMetaRequest,
  ): Promise<DocumentHead> {
    return this.documentsService.patchDocumentMeta(authUser.id, id, payload)
  }

  @ApiOperation({ summary: '删除文档' })
  @ApiRequestResponse(null)
  @Delete(':id')
  async deleteDocument(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
  ): Promise<null> {
    await this.documentsService.deleteDocument(authUser.id, id)
    return null
  }

  @ApiOperation({ summary: '上传文档图片' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiRequestResponse(documentAssetApiSchema)
  @Post(':id/assets/images')
  async uploadDocumentImage(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
    @Req() request: FastifyRequest,
  ): Promise<DocumentAsset> {
    const file = await request.file()

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

  @ApiOperation({ summary: '上传文档附件' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiRequestResponse(documentAssetApiSchema)
  @Post(':id/assets/files')
  async uploadDocumentFile(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
    @Req() request: FastifyRequest,
  ): Promise<DocumentAsset> {
    const file = await request.file()

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

  @ApiOperation({ summary: '解析文档资源投影' })
  @ApiBody({ schema: resolveDocumentAssetsRequestApiSchema })
  @ApiRequestResponse(resolveDocumentAssetsResponseApiSchema)
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

  @ApiOperation({ summary: '读取文档资源内容' })
  @ApiRequestResponse(null)
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
