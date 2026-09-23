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
}
