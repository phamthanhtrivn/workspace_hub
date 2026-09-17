import { Injectable, Logger } from '@nestjs/common';
import { HttpJsonClient } from './http-json.client';
import { RuntimeConfigService } from '../config/runtime-config.service';
import { UserContact, UserDirectory } from './project-communication.port';
import { UserProfileSnapshotService } from '../../modules/user-profile-snapshot/user-profile-snapshot.service';
import { UserProfileSnapshotEventType } from '../../modules/user-profile-snapshot/types/user-profile-snapshot.enums';

interface UserProfileResponse {
  data?: {
    email?: unknown;
    fullName?: unknown;
    avatarUrl?: unknown;
  };
}

@Injectable()
export class HttpUserDirectoryAdapter implements UserDirectory {
  private readonly logger = new Logger(HttpUserDirectoryAdapter.name);

  constructor(
    private readonly http: HttpJsonClient,
    private readonly config: RuntimeConfigService,
    private readonly userProfiles: UserProfileSnapshotService,
  ) {}

  async getContact(userId: string): Promise<UserContact> {
    const snapshot = await this.userProfiles.getProfileByUserId(userId);
    if (snapshot?.email && snapshot.email.trim()) {
      return {
        email: snapshot.email,
        ...(snapshot.fullName?.trim() ? { fullName: snapshot.fullName } : {}),
        ...(snapshot.avatarUrl?.trim() ? { avatarUrl: snapshot.avatarUrl } : {}),
      };
    }

    try {
      const response = await this.http.request<UserProfileResponse>({
        service: 'User service',
        url: `${this.config.userServiceUrl}/api/users/${encodeURIComponent(userId)}/profile`,
      });
      const email = response?.data?.email;
      if (typeof email !== 'string' || !email.trim()) {
        throw new Error(`User ${userId} has no email address`);
      }

      const fullName =
        typeof response.data?.fullName === 'string'
          ? response.data.fullName
          : undefined;
      const avatarUrl =
        typeof response.data?.avatarUrl === 'string'
          ? response.data.avatarUrl
          : undefined;

      // Seed local snapshot in background
      void this.userProfiles
        .upsertFromEvent({
          eventType: UserProfileSnapshotEventType.UPSERTED,
          userId,
          email,
          fullName,
          avatarUrl,
        })
        .catch((err: unknown) => {
          this.logger.warn(
            `Failed to seed snapshot for user ${userId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        });

      return {
        email,
        ...(fullName?.trim() ? { fullName } : {}),
        ...(avatarUrl?.trim() ? { avatarUrl } : {}),
      };
    } catch (error) {
      if (snapshot?.email) {
        return {
          email: snapshot.email,
          ...(snapshot.fullName?.trim() ? { fullName: snapshot.fullName } : {}),
          ...(snapshot.avatarUrl?.trim() ? { avatarUrl: snapshot.avatarUrl } : {}),
        };
      }
      throw error;
    }
  }
}
