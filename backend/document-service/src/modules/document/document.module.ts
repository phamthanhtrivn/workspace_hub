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

import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    QuotaModule,
    S3Module,
    UserProfileSnapshotModule,
  ],
  controllers: [DocumentController, InternalDocumentAccessController],
  providers: [
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
    ProjectDocumentAttachmentService,
    DocumentDownloadService,
    TrashCleanupService,
    ProjectDocumentRealtimeClient,
    StorageCleanupService,
  ],
  exports: [DocumentService],
})
export class DocumentModule {}
