import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class DocumentBaseDto {
  @ApiProperty({ description: '文档 ID' })
  id!: string

  @ApiProperty({ description: '文档标题' })
  title!: string

  @ApiProperty({ description: '文档摘要' })
  summary!: string

  @ApiProperty({ description: '创建时间', format: 'date-time' })
  createdAt!: string

  @ApiProperty({ description: '更新时间', format: 'date-time' })
  updatedAt!: string
}

export class DocumentTreeNodeDto extends DocumentBaseDto {
  @ApiProperty({ description: '父文档 ID', nullable: true })
  parentId!: string | null

  @ApiProperty({ description: '是否存在子文档' })
  hasChildren!: boolean

  @ApiProperty({ description: '是否存在正文内容' })
  hasContent!: boolean

  @ApiProperty({ description: '共享来源展示名', nullable: true })
  sharedByDisplayName!: string | null

  @ApiProperty({ description: '子文档', type: () => [DocumentTreeNodeDto] })
  children!: DocumentTreeNodeDto[]
}

export class DocumentTreeSectionDto {
  @ApiProperty({ description: '分组标识', enum: ['personal', 'shared', 'team'] })
  id!: 'personal' | 'shared' | 'team'

  @ApiProperty({ description: '分组标题' })
  label!: string

  @ApiProperty({ description: '分组下节点', type: () => [DocumentTreeNodeDto] })
  nodes!: DocumentTreeNodeDto[]
}

export class DocumentNodeDetailDto extends DocumentBaseDto {
  @ApiProperty({ description: '父文档 ID', nullable: true })
  parentId!: string | null

  @ApiProperty({ description: '正文内容' })
  content!: string

  @ApiProperty({ description: '是否存在子文档' })
  hasChildren!: boolean

  @ApiProperty({ description: '是否存在正文内容' })
  hasContent!: boolean

  @ApiProperty({ description: '文档所属空间', enum: ['PERSONAL', 'TEAM'] })
  scope!: 'PERSONAL' | 'TEAM'

  @ApiProperty({ description: '当前查看视角分组', enum: ['personal', 'shared', 'team'] })
  section!: 'personal' | 'shared' | 'team'
}

export class CreateDocumentNodeDto {
  @ApiProperty({ description: '文档标题' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  title!: string

  @ApiProperty({ description: '正文内容', required: false, default: '' })
  @IsString()
  @IsOptional()
  content?: string

  @ApiProperty({ description: '父文档 ID', required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  parentId?: string | null
}

export class UpdateDocumentNodeDto {
  @ApiProperty({ description: '文档标题' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  title!: string

  @ApiProperty({ description: '正文内容' })
  @IsString()
  content!: string
}

export class CreateDocumentNodeResponseDto extends DocumentNodeDetailDto {}
export class UpdateDocumentNodeResponseDto extends DocumentNodeDetailDto {}
