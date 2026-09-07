import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CALENDAR_ERROR_MESSAGES } from '../../common/constants/calendar.constants';

@Injectable()
export class ResourceAccessService {
  private readonly projectServiceUrl =
    process.env.PROJECT_SERVICE_URL ?? 'http://project-service:8082';
  private readonly documentServiceUrl =
    process.env.DOCUMENT_SERVICE_URL ?? 'http://document-service:8085';

  async assertProjectAccess(userId: string, projectId?: string | null) {
    if (!projectId) return;
    await this.assertAuthorized(
      `${this.projectServiceUrl}/api/projects/${projectId}`,
      { 'x-user-id': userId },
      CALENDAR_ERROR_MESSAGES.PROJECT_ACCESS_DENIED,
    );
  }

  async assertDocumentAccess(
    userId: string,
    userEmail: string | undefined,
    documentIds?: string[],
  ) {
    const uniqueDocumentIds = [...new Set(documentIds ?? [])];
    if (uniqueDocumentIds.length === 0) return;
    if (!userEmail) {
      throw new ForbiddenException(
        CALENDAR_ERROR_MESSAGES.DOCUMENT_ACCESS_DENIED,
      );
    }

    await Promise.all(
      uniqueDocumentIds.map((documentId) =>
        this.assertAuthorized(
          `${this.documentServiceUrl}/api/documents/${documentId}/access`,
          { 'x-user-id': userId, 'x-user-email': userEmail },
          CALENDAR_ERROR_MESSAGES.DOCUMENT_ACCESS_DENIED,
        ),
      ),
    );
  }

  private async assertAuthorized(
    url: string,
    headers: Record<string, string>,
    forbiddenMessage: string,
  ) {
    let response: globalThis.Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new ServiceUnavailableException('Dependent service unavailable');
    }

    if ([401, 403, 404].includes(response.status)) {
      throw new ForbiddenException(forbiddenMessage);
    }
    if (!response.ok) {
      throw new ServiceUnavailableException('Dependent service unavailable');
    }
  }
}
