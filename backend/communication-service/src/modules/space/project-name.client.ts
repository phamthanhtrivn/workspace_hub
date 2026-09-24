import { Injectable } from '@nestjs/common';
import { HttpJsonClient } from '../../common/adapters/http-json.client';
import { RuntimeConfigService } from '../../common/config/runtime-config.service';

export interface RenameProjectResponse {
  projectId: string;
  name: string;
}

export interface PublishProjectSpaceEventResponse {
  projectId: string;
  resource: 'PROJECT_SPACE';
  action: 'CREATED' | 'UPDATED' | 'DELETED';
  actorId: string;
  entityId?: string;
  data: {
    exists: boolean;
    spaceId: string | null;
    channelId: string | null;
  };
  occurredAt: string;
}

interface ApiResponse<T> {
  data: T;
}

@Injectable()
export class ProjectNameClient {
  constructor(
    private readonly http: HttpJsonClient,
    private readonly config: RuntimeConfigService,
  ) {}

  async renameProject(
    projectId: string,
    name: string,
    actorId: string,
  ): Promise<RenameProjectResponse> {
    const response = await this.http.request<ApiResponse<RenameProjectResponse>>({
      service: 'project-service',
      url: `${this.config.projectServiceUrl}/api/projects/internal/${projectId}/name`,
      method: 'PATCH',
      headers: {
        'x-internal-service-key': this.config.internalServiceKey,
        'x-user-id': actorId,
      },
      body: { name, actorId },
    });
    return response.data;
  }

  async publishProjectSpaceEvent(
    projectId: string,
    payload: {
      action: 'CREATED' | 'UPDATED' | 'DELETED';
      actorId: string;
      spaceId?: string | null;
      channelId?: string | null;
      exists?: boolean;
    },
  ): Promise<PublishProjectSpaceEventResponse> {
    const response = await this.http.request<ApiResponse<PublishProjectSpaceEventResponse>>({
      service: 'project-service',
      url: `${this.config.projectServiceUrl}/api/projects/internal/${projectId}/space-events`,
      method: 'POST',
      headers: {
        'x-internal-service-key': this.config.internalServiceKey,
        'x-user-id': payload.actorId,
      },
      body: {
        action: payload.action,
        actorId: payload.actorId,
        entityId: payload.spaceId ?? undefined,
        spaceId: payload.spaceId ?? null,
        channelId: payload.channelId ?? null,
        exists: payload.exists,
      },
    });
    return response.data;
  }
}
