import type { CreateDocumentRequest, DocumentDetail, DocumentRecent, DocumentTreeGroup, UpdateDocumentRequest } from '@haohaoxue/samepage-domain'
import type { AuthUserContext } from '../auth/auth.interface'
import { CreateDocumentSchema, UpdateDocumentSchema } from '@haohaoxue/samepage-contracts'
import { zodToApiSchema } from '@haohaoxue/samepage-shared'
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe'
import { ApiRequestResponse } from '../../utils/swagger'
import { DocumentsService } from './documents.service'

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @ApiOperation({ summary: '创建文档' })
  @ApiBody({ schema: zodToApiSchema(CreateDocumentSchema) })
  @ApiRequestResponse({ type: 'object' })
  @Post()
  async createDocument(
    @CurrentUser() authUser: AuthUserContext,
    @Body(new ZodValidationPipe(CreateDocumentSchema)) payload: CreateDocumentRequest,
  ): Promise<DocumentDetail> {
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

  @ApiOperation({ summary: '获取文档详情' })
  @ApiRequestResponse({ type: 'object' })
  @Get(':id')
  async getDocumentById(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
  ): Promise<DocumentDetail> {
    return this.documentsService.getDocumentById(authUser.id, id)
  }

  @ApiOperation({ summary: '更新文档' })
  @ApiBody({ schema: zodToApiSchema(UpdateDocumentSchema) })
  @ApiRequestResponse({ type: 'object' })
  @Patch(':id')
  async updateDocument(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateDocumentSchema)) payload: UpdateDocumentRequest,
  ): Promise<DocumentDetail> {
    return this.documentsService.updateDocument(authUser.id, id, payload)
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
