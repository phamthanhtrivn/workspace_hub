import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CHAT_CONTEXT_TYPE } from '../../common/types/chat.enums';
import { ChannelAccessService } from '../channel/access/channel-access.service';
import { DirectMessagePermissionService } from '../direct-message/direct-message-permission.service';
import { MeetingPolicyService } from '../meeting/services/meeting-policy.service';

@Injectable()
export class MediaAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly channels: ChannelAccessService,
    private readonly directMessages: DirectMessagePermissionService,
    private readonly meetings: MeetingPolicyService,
  ) {}

  async assertCanUpload(
    referenceId: string,
    chatType: CHAT_CONTEXT_TYPE,
    userId: string,
  ) {
    if (chatType === CHAT_CONTEXT_TYPE.CHANNEL) {
      await this.channels.assertPrivateAccess(referenceId, userId);
    } else if (chatType === CHAT_CONTEXT_TYPE.DIRECT_MESSAGE) {
      await this.directMessages.assertCanSend(referenceId, userId);
    } else if (chatType === CHAT_CONTEXT_TYPE.MEETING) {
      const meeting = await this.prisma.meeting.findUnique({
        where: { id: referenceId },
        select: { joinToken: true },
      });
      await this.meetings.assertJoinedMeetingParticipant({
        joinToken: meeting?.joinToken ?? '',
        userId,
      });
    } else {
      throw new BadRequestException('Invalid attachment chat context');
    }
  }
}
