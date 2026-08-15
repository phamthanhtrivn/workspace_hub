import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { USER_PROFILE_SNAPSHOT_KAFKA } from './types/user-profile-snapshot.constants';
import type { UserProfileSnapshotPayload } from './types/user-profile-snapshot.types';
import { UserProfileSnapshotService } from './user-profile-snapshot.service';

@Controller()
export class UserProfileSnapshotConsumer {
  private readonly logger = new Logger(UserProfileSnapshotConsumer.name);

  constructor(
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
  ) {}

  @EventPattern(USER_PROFILE_SNAPSHOT_KAFKA.TOPIC)
  async handleUserProfileSnapshotEvent(
    @Payload() payload: UserProfileSnapshotPayload,
  ) {
    try {
      await this.userProfileSnapshotService.upsertFromEvent(payload);
    } catch (error) {
      this.logger.error(
        `Failed to process user profile snapshot event: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }
}
