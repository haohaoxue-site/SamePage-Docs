import { Module } from '@nestjs/common'
import { StorageModule } from '../storage/storage.module'
import { DocumentAccessService } from './document-access.service'
import { DocumentAssetsService } from './document-assets.service'
import { DocumentsController } from './documents.controller'
import { DocumentsService } from './documents.service'

@Module({
  imports: [StorageModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentAccessService, DocumentAssetsService],
})
export class DocumentsModule {}
