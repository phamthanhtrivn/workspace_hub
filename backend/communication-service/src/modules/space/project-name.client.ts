import { Injectable } from '@nestjs/common';
import { HttpJsonClient } from '../../common/adapters/http-json.client';
import { RuntimeConfigService } from '../../common/config/runtime-config.service';

export interface RenameProjectResponse {
  projectId: string;
  name: string;
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
}
