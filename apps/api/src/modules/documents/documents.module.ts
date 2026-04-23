import { Module } from '@nestjs/common'
import { StorageModule } from '../storage/storage.module'
import { DocumentAccessService } from './document-access.service'
import { DocumentAssetsService } from './document-assets.service'
import { DocumentShareAccessService } from './document-share-access.service'
import { DocumentShareRecipientsController } from './document-share-recipients.controller'
import { DocumentShareRecipientsService } from './document-share-recipients.service'
import { DocumentSharesController } from './document-shares.controller'
import { DocumentSharesService } from './document-shares.service'
import { DocumentSnapshotsService } from './document-snapshots.service'
import { DocumentTrashService } from './document-trash.service'
import { DocumentsController } from './documents.controller'
import { DocumentsService } from './documents.service'

@Module({
  imports: [StorageModule],
  controllers: [DocumentsController, DocumentSharesController, DocumentShareRecipientsController],
  providers: [DocumentsService, DocumentAccessService, DocumentAssetsService, DocumentShareAccessService, DocumentShareRecipientsService, DocumentSharesService, DocumentSnapshotsService, DocumentTrashService],
  exports: [DocumentShareAccessService, DocumentShareRecipientsService, DocumentSharesService],
})
export class DocumentsModule {}
