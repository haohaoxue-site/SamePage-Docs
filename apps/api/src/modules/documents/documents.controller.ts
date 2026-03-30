import type { AuthUserContext } from '../auth/auth.interface'
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { ApiRequestResponse } from '../../utils/swagger'
import {
  CreateDocumentNodeDto,
  CreateDocumentNodeResponseDto,
  DocumentBaseDto,
  DocumentNodeDetailDto,
  DocumentTreeSectionDto,
  UpdateDocumentNodeDto,
  UpdateDocumentNodeResponseDto,
} from './documents.dto'
import { DocumentsService } from './documents.service'

@ApiTags('document-tree')
@Controller('document-tree')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @ApiOperation({ summary: '创建文档' })
  @ApiRequestResponse(CreateDocumentNodeResponseDto)
  @Post()
  async create(
    @CurrentUser() authUser: AuthUserContext,
    @Body() payload: CreateDocumentNodeDto,
  ): Promise<CreateDocumentNodeResponseDto> {
    return this.documentsService.create(authUser.id, payload)
  }

  @ApiOperation({ summary: '获取当前用户可见的文档树' })
  @ApiRequestResponse([DocumentTreeSectionDto])
  @Get()
  async findTree(@CurrentUser() authUser: AuthUserContext): Promise<DocumentTreeSectionDto[]> {
    return this.documentsService.findTree(authUser.id)
  }

  @ApiOperation({ summary: '获取最近文档' })
  @ApiRequestResponse([DocumentBaseDto])
  @Get('recent')
  async findRecent(@CurrentUser() authUser: AuthUserContext): Promise<DocumentBaseDto[]> {
    return this.documentsService.findRecent(authUser.id)
  }

  @ApiOperation({ summary: '获取文档详情' })
  @ApiRequestResponse(DocumentNodeDetailDto)
  @Get(':id')
  async findOne(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
  ): Promise<DocumentNodeDetailDto> {
    return this.documentsService.findOne(authUser.id, id)
  }

  @ApiOperation({ summary: '更新文档' })
  @ApiRequestResponse(UpdateDocumentNodeResponseDto)
  @Patch(':id')
  async update(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
    @Body() payload: UpdateDocumentNodeDto,
  ): Promise<UpdateDocumentNodeResponseDto> {
    return this.documentsService.update(authUser.id, id, payload)
  }

  @ApiOperation({ summary: '删除文档' })
  @ApiRequestResponse(null)
  @Delete(':id')
  async remove(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') id: string,
  ): Promise<null> {
    await this.documentsService.remove(authUser.id, id)
    return null
  }
}
