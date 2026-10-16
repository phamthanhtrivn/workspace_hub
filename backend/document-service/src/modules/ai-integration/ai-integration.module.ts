import { Module } from '@nestjs/common';
import { DocumentModule } from '../document/document.module';
import { S3Module } from '../../infrastructure/s3/s3.module';
import { AiIntegrationController } from './ai-integration.controller';
import { AiIntegrationService } from './ai-integration.service';
import { AiDocumentResolverService } from './ai-document-resolver.service';
import { AiDelegationGuard } from './guards/ai-delegation.guard';

@Module({
  imports: [DocumentModule, S3Module],
  controllers: [AiIntegrationController],
  providers: [
    AiIntegrationService,
    AiDocumentResolverService,
    AiDelegationGuard,
  ],
})
export class AiIntegrationModule {}
