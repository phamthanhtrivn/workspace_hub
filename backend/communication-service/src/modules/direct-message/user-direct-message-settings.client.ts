import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpJsonClient } from '../../common/adapters/http-json.client';
import { RuntimeConfigService } from '../../common/config/runtime-config.service';
import { DIRECT_MESSAGE_PERMISSION_MESSAGES } from './types/direct-message-permission.constants';

interface DirectMessageSettingsResponse {
  data?: { allowNewDirectMessages?: boolean };
}

@Injectable()
export class UserDirectMessageSettingsClient {
  private readonly logger = new Logger(UserDirectMessageSettingsClient.name);

  constructor(
    private readonly http: HttpJsonClient,
    private readonly config: RuntimeConfigService,
  ) {}

  async allowsNewDirectMessages(userId: string): Promise<boolean> {
    try {
      const response = await this.http.request<DirectMessageSettingsResponse>({
        service: 'user-service',
        url: `${this.config.userServiceUrl}/api/users/internal/${userId}/direct-message-settings`,
        headers: { 'x-internal-service-key': this.config.internalServiceKey },
      });
      const allowed = response?.data?.allowNewDirectMessages;
      if (typeof allowed !== 'boolean') {
        throw new Error('Invalid direct message settings response');
      }
      return allowed;
    } catch (error) {
      this.logger.warn(
        `Unable to read direct message setting for recipient ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new ServiceUnavailableException(
        DIRECT_MESSAGE_PERMISSION_MESSAGES.UNAVAILABLE,
      );
    }
  }
}
