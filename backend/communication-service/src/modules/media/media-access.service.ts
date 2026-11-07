import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CHAT_CONTEXT_TYPE } from '../../common/types/chat.enums';
import { ChannelAccessService } from '../channel/access/channel-access.service';
import { DirectMessagePermissionService } from '../direct-message/direct-message-permission.service';
import { MeetingPolicyService } from '../meeting/services/meeting-policy.service';
import { S3_UPLOAD_TYPE } from '../../common/types/file.enums';
import { MEDIA_ERROR_MESSAGES } from './types/media.enums';

@Injectable()
export class MediaAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly channels: ChannelAccessService,
    private readonly directMessages: DirectMessagePermissionService,
    private readonly meetings: MeetingPolicyService,
  ) {}

  async assertCanRead(key: string, userId: string) {
    if (!userId || !key || key.length > 1024 || !key.startsWith(`${S3_UPLOAD_TYPE.CHAT_MEDIA}/`) || /(^|\/)\.\.?($|\/)/.test(key)) {
      throw new NotFoundException(MEDIA_ERROR_MESSAGES.ATTACHMENT_NOT_FOUND);
    }
    const where = { s3Key: key, message: { recalled: false, deletedAt: null } };
    const [channel, direct, meeting] = await Promise.all([
      this.prisma.media.findMany({ where, select: { message: { select: { channelId: true } } } }),
      this.prisma.directMedia.findMany({ where, select: { message: { select: { conversationId: true } } } }),
      this.prisma.meetingMedia.findMany({ where, select: { message: { select: { meeting: { select: { joinToken: true } } } } } }),
    ]);
    const checks = [
      ...[...new Set(channel.map((row) => row.message.channelId))].map((id) => () => this.channels.assertPrivateAccess(id, userId)),
      ...[...new Set(direct.map((row) => row.message.conversationId))].map((id) => () => this.directMessages.assertCanRead(id, userId)),
      ...[...new Set(meeting.map((row) => row.message.meeting.joinToken))].map((joinToken) => () => this.meetings.assertJoinedMeetingParticipant({ joinToken, userId })),
    ];
    for (const check of checks) {
      try { await check(); return; }
      catch (error) {
        if (!(error instanceof ForbiddenException || error instanceof NotFoundException)) throw error;
      }
    }
    throw new NotFoundException(MEDIA_ERROR_MESSAGES.ATTACHMENT_NOT_FOUND);
  }

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
