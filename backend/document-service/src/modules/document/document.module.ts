import { Module } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { QuotaModule } from '../quota/quota.module';
import { S3Module } from '../../infrastructure/s3/s3.module';

@Module({
  imports: [QuotaModule, S3Module],
  controllers: [DocumentController],
  providers: [DocumentService],
  exports: [DocumentService],
})
export class DocumentModule {}
