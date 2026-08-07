import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { QuotaModule } from '../quota/quota.module';
import { S3Module } from '../../infrastructure/s3/s3.module';
import { TrashCleanupService } from './trash-cleanup.service';

@Module({
  imports: [ScheduleModule.forRoot(), QuotaModule, S3Module],
  controllers: [DocumentController],
  providers: [DocumentService, TrashCleanupService],
  exports: [DocumentService],
})
export class DocumentModule {}
