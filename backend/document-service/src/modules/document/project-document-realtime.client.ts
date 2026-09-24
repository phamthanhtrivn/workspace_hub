import { Injectable, Logger } from '@nestjs/common';

type ProjectDocumentAction = 'CREATED' | 'UPDATED' | 'DELETED';

interface ProjectDocumentEventPayload {
  projectId: string;
  action: ProjectDocumentAction;
  actorId: string;
  entityId: string;
  parentFolderId?: string | null;
  data?: Record<string, unknown>;
}

@Injectable()
export class ProjectDocumentRealtimeClient {
  private readonly logger = new Logger(ProjectDocumentRealtimeClient.name);
  private readonly projectServiceUrl = (
    process.env.PROJECT_SERVICE_URL ?? 'http://localhost:8082'
  ).replace(/\/+$/, '');
  private readonly internalServiceKey =
    process.env.INTERNAL_SERVICE_KEY || 'local-internal-key';
  private readonly timeoutMs = this.positiveInteger(
    process.env.SERVICE_HTTP_TIMEOUT_MS,
    5_000,
  );

  async publish(payload: ProjectDocumentEventPayload): Promise<void> {
    const response = await fetch(
      `${this.projectServiceUrl}/api/projects/internal/${payload.projectId}/document-events`,
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-internal-service-key': this.internalServiceKey,
        },
        body: JSON.stringify({
          action: payload.action,
          actorId: payload.actorId,
          entityId: payload.entityId,
          parentFolderId: payload.parentFolderId ?? null,
          data: payload.data,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      },
    );

    if (!response.ok) {
      this.logger.warn(
        `Project document event publish failed with HTTP ${response.status}`,
      );
    }
  }

  private positiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
