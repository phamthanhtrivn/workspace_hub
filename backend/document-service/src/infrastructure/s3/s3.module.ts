import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { UploadIntentService } from './upload-intent.service';

@Module({
  providers: [S3Service, UploadIntentService],
  exports: [S3Service],
})
export class S3Module {}
