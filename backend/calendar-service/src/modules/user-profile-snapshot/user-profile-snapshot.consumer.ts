import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_CONFIG } from '../../infrastructure/kafka/kafka.constants';
import type { UserProfileSnapshotPayload } from './types/user-profile-snapshot.types';
import { UserProfileSnapshotService } from './user-profile-snapshot.service';

@Controller()
export class UserProfileSnapshotConsumer {
  constructor(
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
  ) {}

  @EventPattern(KAFKA_CONFIG.TOPIC)
  async handleUserProfileSnapshotEvent(
    @Payload() payload: UserProfileSnapshotPayload,
  ) {
    await this.userProfileSnapshotService.upsertFromEvent(payload);
  }
}
