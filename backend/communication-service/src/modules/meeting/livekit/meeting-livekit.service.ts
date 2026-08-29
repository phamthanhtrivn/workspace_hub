import { Inject, Injectable } from '@nestjs/common';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import {
  LIVEKIT_CONFIG,
  LIVEKIT_ROOM_SERVICE_CLIENT,
} from '../../../infrastructure/livekit/livekit.constants';
import type { LiveKitConfig } from '../../../infrastructure/livekit/livekit.types';
import { UserProfileSnapshotService } from '../../user-profile-snapshot/user-profile-snapshot.service';
import { MeetingDefault } from '../types/meeting.enums';
import { MeetingLiveKitTokenResponse } from '../types/meeting.types';

@Injectable()
export class MeetingLiveKitService {
  constructor(
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
    @Inject(LIVEKIT_CONFIG)
    private readonly liveKitConfig: LiveKitConfig,
    @Inject(LIVEKIT_ROOM_SERVICE_CLIENT)
    private readonly liveKitRoomServiceClient: RoomServiceClient,
  ) {}

  async createParticipantToken(
    roomName: string,
    userId: string,
  ): Promise<MeetingLiveKitTokenResponse> {
    const profile = (
      await this.userProfileSnapshotService.getProfilesByUserIds([userId])
    ).get(userId);
    const displayName = profile?.fullName || profile?.email || userId;
    const accessToken = new AccessToken(
      this.liveKitConfig.apiKey,
      this.liveKitConfig.apiSecret,
      {
        identity: userId,
        name: displayName,
        metadata: JSON.stringify({
          email: profile?.email ?? null,
          avatarUrl: profile?.avatarUrl ?? null,
        }),
        ttl: MeetingDefault.LIVEKIT_TOKEN_TTL_SECONDS,
      },
    );

    accessToken.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return {
      serverUrl: this.liveKitConfig.publicUrl,
      token: await accessToken.toJwt(),
      roomName,
    };
  }

  async removeParticipant(roomName: string, userId: string) {
    try {
      await this.liveKitRoomServiceClient.removeParticipant(roomName, userId);
    } catch (error) {
      console.warn('Could not remove LiveKit meeting participant', {
        roomName,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async deleteRoom(roomName: string) {
    try {
      await this.liveKitRoomServiceClient.deleteRoom(roomName);
    } catch (error) {
      if (this.isNotFoundError(error)) return;

      console.warn('Could not delete LiveKit meeting room', {
        roomName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private isNotFoundError(error: unknown) {
    if (!(error instanceof Error)) return false;

    return /not found|404/i.test(error.message);
  }
}
