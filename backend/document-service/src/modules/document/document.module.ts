import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { QuotaModule } from '../quota/quota.module';
import { S3Module } from '../../infrastructure/s3/s3.module';
import { TrashCleanupService } from './trash-cleanup.service';

import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    QuotaModule,
    S3Module,
    UserProfileSnapshotModule,
  ],
  controllers: [DocumentController],
  providers: [DocumentService, TrashCleanupService],
  exports: [DocumentService],
})
export class DocumentModule {}
