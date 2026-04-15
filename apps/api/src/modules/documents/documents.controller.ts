import type {
  CreateDocumentRequest,
  CreateDocumentResponse,
  CreateDocumentSnapshotRequest,
  CreateDocumentSnapshotResponse,
  DocumentHead,
  DocumentRecent,
  DocumentSnapshot,
  DocumentTreeGroup,
  PatchDocumentMetaRequest,
  RestoreDocumentSnapshotRequest,
} from '@haohaoxue/samepage-domain'
import type { AuthUserContext } from '../auth/auth.interface'
import {
  CreateDocumentSchema,
  CreateDocumentSnapshotSchema,
  PatchDocumentMetaSchema,
  RestoreDocumentSnapshotSchema,
} from '@haohaoxue/samepage-contracts'
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe'
import { ApiRequestResponse } from '../../utils/swagger'
import { DocumentsService } from './documents.service'
import {
  createDocumentRequestApiSchema,
  createDocumentResponseApiSchema,
  createDocumentSnapshotRequestApiSchema,
  createDocumentSnapshotResponseApiSchema,
  patchDocumentMetaRequestApiSchema,
  restoreDocumentSnapshotRequestApiSchema,
} from './documents.swagger'

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

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
}
