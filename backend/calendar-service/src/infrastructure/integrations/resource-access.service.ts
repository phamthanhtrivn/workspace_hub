import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CALENDAR_ERROR_MESSAGES } from '../../common/constants/calendar.constants';
import { getServiceEndpoints } from '../../common/config/service-endpoints';

@Injectable()
export class ResourceAccessService {
  private readonly documentServiceUrl = getServiceEndpoints().document;

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

    const key = process.env.CALENDAR_DOCUMENT_SERVICE_KEY?.trim();
    if (!key || key.length < 32)
      throw new ServiceUnavailableException(
        'Calendar document credentials are not configured',
      );
    for (let offset = 0; offset < uniqueDocumentIds.length; offset += 50) {
      await this.assertAuthorized(
        `${this.documentServiceUrl}/internal/document-access/resolve`,
        {
          userId,
          userEmail,
          documentIds: uniqueDocumentIds.slice(offset, offset + 50),
        },
        key,
      );
    }
  }

  private async assertAuthorized(
    url: string,
    body: { userId: string; userEmail: string; documentIds: string[] },
    key: string,
  ) {
    let response: globalThis.Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-service-key': key,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
        redirect: 'error',
      });
    } catch {
      throw new ServiceUnavailableException('Dependent service unavailable');
    }

    if ([403, 404].includes(response.status)) {
      throw new ForbiddenException(
        CALENDAR_ERROR_MESSAGES.DOCUMENT_ACCESS_DENIED,
      );
    }
    if (!response.ok) {
      throw new ServiceUnavailableException('Dependent service unavailable');
    }
  }
}
