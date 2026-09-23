import { Injectable } from '@nestjs/common';
import { HttpJsonClient } from '../../common/adapters/http-json.client';
import { RuntimeConfigService } from '../../common/config/runtime-config.service';

export type ProjectSpaceRole = 'ADMIN' | 'MEMBER';

export interface EnsureProjectSpaceMember {
  userId: string;
  role: ProjectSpaceRole;
}

export interface EnsureProjectSpaceRequest {
  projectId: string;
  name: string;
  ownerId: string;
  members: EnsureProjectSpaceMember[];
}

export interface ProjectSpaceResponse {
  projectId: string;
  spaceId: string;
  channelId: string;
}

export interface ProjectSpaceStatusResponse {
  projectId: string;
  exists: boolean;
  spaceId: string | null;
  channelId: string | null;
}

export interface RenameProjectSpaceResponse {
  projectId: string;
  spaceId: string | null;
  name: string;
}

interface ApiResponse<T> {
  data: T;
}

@Injectable()
export class ProjectSpaceClient {
  constructor(
    private readonly http: HttpJsonClient,
    private readonly config: RuntimeConfigService,
  ) {}

  async ensureProjectSpace(
    payload: EnsureProjectSpaceRequest,
  ): Promise<ProjectSpaceResponse> {
    const response = await this.http.request<ApiResponse<ProjectSpaceResponse>>({
      service: 'communication-service',
      url: `${this.config.communicationServiceUrl}/api/spaces/project`,
      method: 'POST',
      body: payload,
    });
    return response.data;
  }

  async getProjectSpaceStatus(
    projectId: string,
  ): Promise<ProjectSpaceStatusResponse> {
    const response = await this.http.request<ApiResponse<ProjectSpaceStatusResponse>>({
      service: 'communication-service',
      url: `${this.config.communicationServiceUrl}/api/spaces/internal/project/${projectId}`,
      method: 'GET',
      headers: this.internalHeaders(),
    });
    return response.data;
  }

  async renameProjectSpace(
    projectId: string,
    name: string,
    actorId: string,
  ): Promise<RenameProjectSpaceResponse> {
    const response = await this.http.request<ApiResponse<RenameProjectSpaceResponse>>({
      service: 'communication-service',
      url: `${this.config.communicationServiceUrl}/api/spaces/internal/project/${projectId}/name`,
      method: 'PATCH',
      headers: this.internalHeaders(),
      body: { name, actorId },
    });
    return response.data;
  }

  private internalHeaders(): Record<string, string> {
    return { 'x-internal-service-key': this.config.internalServiceKey };
  }
}
