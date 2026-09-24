import { Injectable } from '@nestjs/common';
import { HttpJsonClient } from '../../common/adapters/http-json.client';
import { RuntimeConfigService } from '../../common/config/runtime-config.service';

export interface TaskDocumentMetadata {
  id: string;
  name: string;
  mimeType: string | null;
  sizeBytes: number;
  projectId: string | null;
}

interface ApiResponse<T> {
  data: T;
}

interface TaskDocumentRequest {
  projectId: string;
  userId: string;
  userEmail: string;
  documentItemIds: string[];
}

@Injectable()
export class TaskDocumentClient {
  constructor(
    private readonly http: HttpJsonClient,
    private readonly config: RuntimeConfigService,
  ) {}

  async resolveProjectFiles(
    request: TaskDocumentRequest,
  ): Promise<TaskDocumentMetadata[]> {
    const response = await this.http.request<ApiResponse<TaskDocumentMetadata[]>>({
      service: 'document-service',
      url: `${this.config.documentServiceUrl}/api/documents/internal/task-attachments/resolve`,
      method: 'POST',
      headers: this.internalHeaders(),
      body: request,
    });
    return response.data;
  }

  async importPersonalFiles(
    request: TaskDocumentRequest,
  ): Promise<TaskDocumentMetadata[]> {
    const response = await this.http.request<ApiResponse<TaskDocumentMetadata[]>>({
      service: 'document-service',
      url: `${this.config.documentServiceUrl}/api/documents/internal/task-attachments/import`,
      method: 'POST',
      headers: this.internalHeaders(),
      body: request,
    });
    return response.data;
  }

  private internalHeaders(): Record<string, string> {
    return { 'x-internal-service-key': this.config.internalServiceKey };
  }
}
