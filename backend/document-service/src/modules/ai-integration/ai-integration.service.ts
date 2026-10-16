import {
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AiDocumentResolverService } from './ai-document-resolver.service';
import { AI_DOCUMENT_MESSAGES } from './ai-integration.constants';
import type { AiActor, AiDocumentManifest } from './types/ai-document.types';
import type { ResolveAiDocumentsDto } from './dto/resolve-ai-documents.dto';

@Injectable()
export class AiIntegrationService {
  constructor(private readonly resolver: AiDocumentResolverService) {}

  async resolveBatch(
    actor: AiActor,
    request: ResolveAiDocumentsDto,
    withDownload: boolean,
  ): Promise<AiDocumentManifest[]> {
    const manifests: AiDocumentManifest[] = [];
    for (const [position, reference] of request.documents.entries()) {
      try {
        manifests.push(
          await this.resolver.resolve(actor, reference, withDownload),
        );
      } catch (error) {
        if (error instanceof HttpException) {
          throw new HttpException(
            {
              message: AI_DOCUMENT_MESSAGES.INVALID_SOURCE,
              errors: {
                documents: {
                  [position]: {
                    documentId: reference.documentId,
                    message: error.message,
                  },
                },
              },
            },
            error.getStatus(),
          );
        }
        throw new ServiceUnavailableException(
          'Document storage is unavailable',
        );
      }
    }
    return manifests;
  }
}
