import { DocumentContentService } from './document-content.service';
import { ModuleFileSnapshotService } from './module-file-snapshot.service';
import { DocumentPickerController } from './document-picker.controller';
import { DocumentPickerService } from './document-picker.service';
import { DocumentContentController } from './document-content.controller';
import { DocumentAccessService } from './document-access.service';
import { DocumentLocationService } from './document-location.service';
import { DocumentEventPublisher } from './document-event-publisher.service';
import { DocumentPresentationService } from './document-presentation.service';
import { DocumentTreeService } from './document-tree.service';
import { DocumentQueryService } from './document-query.service';
import { DocumentPublicQueryService } from './document-public-query.service';
import { DocumentUploadService } from './document-upload.service';
import { DocumentLifecycleService } from './document-lifecycle.service';
import { DocumentSharingService } from './document-sharing.service';
import { DocumentShareNotificationService } from './document-share-notification.service';
import { DocumentNotificationOutboxService } from './document-notification-outbox.service';
import { DocumentBulkService } from './document-bulk.service';
import { DocumentBulkController } from './document-bulk.controller';
import { ProjectDocumentAttachmentService } from './project-document-attachment.service';
import { DocumentDownloadService } from './document-download.service';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { InternalDocumentAccessController } from './internal-access.controller';
import { QuotaModule } from '../quota/quota.module';
import { S3Module } from '../../infrastructure/s3/s3.module';
import { TrashCleanupService } from './trash-cleanup.service';
import { ProjectDocumentRealtimeClient } from './project-document-realtime.client';
import { StorageCleanupService } from './storage-cleanup.service';
import { DocumentAccessRealtimePublisher } from './document-access-realtime.publisher';

import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    QuotaModule,
    S3Module,
    UserProfileSnapshotModule,
  ],
  controllers: [
    DocumentPickerController,
    DocumentContentController,
    DocumentBulkController,
    DocumentController,
    InternalDocumentAccessController,
  ],
  providers: [
    ModuleFileSnapshotService,
    DocumentPickerService,
    DocumentService,
    DocumentAccessService,
    DocumentLocationService,
    DocumentEventPublisher,
    DocumentPresentationService,
    DocumentTreeService,
    DocumentQueryService,
    DocumentPublicQueryService,
    DocumentUploadService,
    DocumentLifecycleService,
    DocumentSharingService,
    DocumentShareNotificationService,
    DocumentNotificationOutboxService,
    DocumentBulkService,
    ProjectDocumentAttachmentService,
    DocumentDownloadService,
    DocumentContentService,
    TrashCleanupService,
    ProjectDocumentRealtimeClient,
    StorageCleanupService,
    DocumentAccessRealtimePublisher,
  ],
  exports: [DocumentService, DocumentAccessService, ModuleFileSnapshotService],
})
export class DocumentModule {}
