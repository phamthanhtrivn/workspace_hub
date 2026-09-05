import { Injectable, Logger } from '@nestjs/common';
import { MeetingRole } from '@prisma/client';
import { LiveKitService } from '../../../infrastructure/livekit/livekit.service';
import { MeetingEvent } from '../../socket/meeting/meeting-socket.events';
import { MeetingSocketHandler } from '../../socket/meeting/meeting-socket.handler';
import { UserProfileSnapshotService } from '../../user-profile-snapshot/user-profile-snapshot.service';

@Injectable()
export class MeetingRealtimeService {
  private readonly logger = new Logger(MeetingRealtimeService.name);

  constructor(
    private readonly liveKitService: LiveKitService,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
    private readonly meetingSocketHandler: MeetingSocketHandler,
  ) {}

  emitMeetingEvent<TPayload>(
    meetingId: string,
    event: MeetingEvent,
    payload: TPayload,
  ) {
    this.meetingSocketHandler.emitToMeeting(meetingId, event, payload);
  }

  emitUserEvent<TPayload>(
    userId: string,
    event: MeetingEvent,
    payload: TPayload,
  ) {
    this.meetingSocketHandler.emitToUser(userId, event, payload);
  }

  async deleteLiveKitRoom(roomName: string) {
    if (!this.liveKitService.isConfigured()) return;

    try {
      await this.liveKitService.deleteRoom(roomName);
    } catch (error) {
      this.logger.warn(
        `Failed to delete LiveKit room ${roomName}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  async removeLiveKitParticipant(roomName: string, userId: string) {
    if (!this.liveKitService.isConfigured()) return;

    try {
      await this.liveKitService.removeParticipant(roomName, userId);
    } catch (error) {
      this.logger.warn(
        `Failed to remove LiveKit participant ${userId} from ${roomName}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  async syncLiveKitParticipantMetadata(
    roomName: string,
    userId: string,
    role: MeetingRole,
  ) {
    if (!this.liveKitService.isConfigured()) return;

    try {
      const profileByUserId =
        await this.userProfileSnapshotService.getProfilesByUserIds([userId]);
      const profile = profileByUserId.get(userId);

      await this.liveKitService.updateParticipantMetadata({
        roomName,
        userId,
        role,
        displayName: profile?.fullName ?? profile?.email,
        avatarUrl: profile?.avatarUrl,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to update LiveKit participant metadata for ${userId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
}
