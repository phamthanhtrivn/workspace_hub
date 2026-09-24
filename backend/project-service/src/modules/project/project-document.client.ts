import { Injectable } from '@nestjs/common';
import { HttpJsonClient } from '../../common/adapters/http-json.client';
import { RuntimeConfigService } from '../../common/config/runtime-config.service';

export interface EnsureProjectRootFolderRequest {
  projectId: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  members: Array<{
    userId: string;
    email: string;
    permission: 'VIEWER' | 'EDITOR';
  }>;
}

export interface ProjectRootFolderResponse {
  projectId: string;
  folderId: string;
  name: string;
}

interface ApiResponse<T> {
  data: T;
}

@Injectable()
export class ProjectDocumentClient {
  constructor(
    private readonly http: HttpJsonClient,
    private readonly config: RuntimeConfigService,
  ) {}

  async ensureProjectRootFolder(
    payload: EnsureProjectRootFolderRequest,
  ): Promise<ProjectRootFolderResponse> {
    const response = await this.http.request<ApiResponse<ProjectRootFolderResponse>>({
      service: 'document-service',
      url: `${this.config.documentServiceUrl}/api/documents/internal/projects/${payload.projectId}/root-folder`,
      method: 'POST',
      headers: this.internalHeaders(),
      body: {
        name: payload.name,
        ownerId: payload.ownerId,
        ownerEmail: payload.ownerEmail,
        members: payload.members,
      },
    });
    return response.data;
  }

  private internalHeaders(): Record<string, string> {
    return { 'x-internal-service-key': this.config.internalServiceKey };
  }
}
