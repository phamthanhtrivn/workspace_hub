import { Injectable } from '@nestjs/common';
import {
  MeetingParticipant,
  MeetingParticipantStatus as PrismaMeetingParticipantStatus,
} from '@prisma/client';
import { UserProfileSnapshotService } from '../../user-profile-snapshot/user-profile-snapshot.service';
import { MeetingClientRoute } from '../types/meeting.enums';
import {
  MeetingParticipantWithProfile,
  MeetingResponse,
  MeetingWithParticipantsAndPendingCountRaw,
} from '../types/meeting.types';

@Injectable()
export class MeetingResponseMapper {
  constructor(
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
  ) {}

  buildJoinUrl(joinToken: string) {
    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '');
    const path = `/${MeetingClientRoute.MEETINGS}/${joinToken}`;
    return frontendUrl ? `${frontendUrl}${path}` : path;
  }

  enrichParticipants(
    participants: MeetingParticipant[],
  ): Promise<MeetingParticipantWithProfile[]> {
    return this.userProfileSnapshotService.attachProfilesToMembers(
      participants,
    );
  }

  async map(
    meeting: MeetingWithParticipantsAndPendingCountRaw,
    userId: string,
  ): Promise<MeetingResponse> {
    const participants = await this.enrichParticipants(
      meeting.participants ?? [],
    );
    const participant = participants.find((item) => item.userId === userId);
    const pendingJoinRequestCount =
      meeting._count?.participants ??
      participants.filter(
        (item) => item.status === PrismaMeetingParticipantStatus.REQUESTED,
      ).length;
    const meetingData = { ...meeting };
    delete (meetingData as Partial<typeof meeting>)._count;

    return {
      ...meetingData,
      participants,
      joinUrl: this.buildJoinUrl(meeting.joinToken),
      currentParticipant: participant ?? null,
      pendingJoinRequestCount,
    };
  }
}
