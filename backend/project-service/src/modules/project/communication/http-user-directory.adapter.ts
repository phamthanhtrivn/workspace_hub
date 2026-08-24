import { Injectable } from '@nestjs/common';
import { HttpJsonClient } from '../../../common/communication/http-json.client';
import { RuntimeConfigService } from '../../../common/config/runtime-config.service';
import { UserContact, UserDirectory } from './project-communication.port';

interface UserProfileResponse {
  data?: {
    email?: unknown;
    fullName?: unknown;
  };
}

@Injectable()
export class HttpUserDirectoryAdapter implements UserDirectory {
  constructor(
    private readonly http: HttpJsonClient,
    private readonly config: RuntimeConfigService,
  ) {}

  async getContact(userId: string): Promise<UserContact> {
    const response = await this.http.request<UserProfileResponse>({
      service: 'User service',
      url: `${this.config.userServiceUrl}/api/users/${encodeURIComponent(userId)}/profile`,
    });
    const email = response?.data?.email;
    if (typeof email !== 'string' || !email.trim()) {
      throw new Error(`User ${userId} has no email address`);
    }

    const fullName = response.data?.fullName;
    return {
      email,
      ...(typeof fullName === 'string' && fullName.trim() ? { fullName } : {}),
    };
  }
}
