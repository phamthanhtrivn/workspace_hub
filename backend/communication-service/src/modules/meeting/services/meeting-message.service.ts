import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { getMediaType, mapMediaWithUrl } from '../../../common/utils/file.util';
import { S3Service } from '../../../infrastructure/s3/s3.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  MESSAGE_DIRECTION,
  MESSAGE_CONSTANTS,
} from '../../message/types/message.enums';
import { MeetingEvent } from '../../socket/meeting/meeting-socket.events';
import { UserProfileSnapshotService } from '../../user-profile-snapshot/user-profile-snapshot.service';
import { MEETING_ERROR_MESSAGES } from '../types/meeting.enums';
import type {
  CreateMeetingMessageParams,
  EditMeetingMessageParams,
  GetMeetingUnreadMessageCountParams,
  ListMeetingMessagesParams,
  ReactMeetingMessageParams,
  ReadMeetingMessageParams,
  TargetMeetingMessageParams,
} from '../types/meeting.types';
import { MeetingPolicyService } from './meeting-policy.service';
import { MeetingRealtimeService } from './meeting-realtime.service';
import { MESSAGE_UPDATE_WINDOW_MS } from '../types/meeting.constants';

@Injectable()
export class MeetingMessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
    private readonly meetingPolicyService: MeetingPolicyService,
    private readonly meetingRealtimeService: MeetingRealtimeService,
  ) {}

  async listMeetingMessages({
    joinToken,
    userId,
    query,
  }: ListMeetingMessagesParams) {
    const { meeting } =
      await this.meetingPolicyService.assertJoinedMeetingParticipant({
        joinToken,
        userId,
      });
    const limit = Math.min(
      50,
      Math.max(1, query?.limit ?? MESSAGE_CONSTANTS.DEFAULT_LIMIT),
    );
    const direction = query?.direction ?? MESSAGE_DIRECTION.OLDER;
    const cursor = query?.cursor;

    if (direction === MESSAGE_DIRECTION.NEWER) {
      return this.getMessagesPage(
        meeting.id,
        limit,
        cursor,
        'asc',
        'prevCursor',
      );
    }

    if (direction === MESSAGE_DIRECTION.AROUND && cursor) {
      return this.getMessagesAround(meeting.id, limit, cursor);
    }

    return this.getMessagesPage(
      meeting.id,
      limit,
      cursor,
      'desc',
      'nextCursor',
    );
  }

  async getUnreadMessageCount({
    joinToken,
    userId,
  }: GetMeetingUnreadMessageCountParams) {
    const { meeting, participant } =
      await this.meetingPolicyService.assertJoinedMeetingParticipant({
        joinToken,
        userId,
      });
    const referenceDate =
      participant.lastReadAt ?? participant.joinedAt ?? participant.createdAt;
    const count = await this.prisma.meetingMessage.count({
      where: {
        meetingId: meeting.id,
        deletedAt: null,
        createdAt: {
          gt: referenceDate,
        },
        senderId: {
          not: userId,
        },
      },
    });

    return { count };
  }

  async createMeetingMessage({
    joinToken,
    userId,
    dto,
  }: CreateMeetingMessageParams) {
    const { meeting } =
      await this.meetingPolicyService.assertJoinedMeetingParticipant({
        joinToken,
        userId,
      });
    const content = dto.content?.trim() ?? '';
    const medias = dto.medias ?? [];

    if (!content && medias.length === 0) {
      throw new BadRequestException(
        MEETING_ERROR_MESSAGES.INVALID_MESSAGE_DATA,
      );
    }

    const createdMessage = await this.prisma.$transaction(async (tx) => {
      const message = await tx.meetingMessage.create({
        data: {
          meetingId: meeting.id,
          senderId: userId,
          content: content || null,
          type: MessageType.TEXT,
          medias:
            medias.length > 0
              ? {
                  create: medias.map((media) => ({
                    name: media.name,
                    s3Key: media.s3Key,
                    mimeType: media.mimeType,
                    sizeBytes: media.sizeBytes,
                    type: getMediaType(media.mimeType),
                  })),
                }
              : undefined,
        },
        include: this.getMessageInclude(),
      });

      await tx.meetingParticipant.update({
        where: {
          meetingId_userId: {
            meetingId: meeting.id,
            userId,
          },
        },
        data: {
          lastReadMessageId: message.id,
          lastReadAt: new Date(),
        },
      });

      return message;
    });
    const payload = await this.mapMeetingMessagePayload(createdMessage);

    this.meetingRealtimeService.emitMeetingEvent(
      meeting.id,
      MeetingEvent.MESSAGE_SENT,
      payload,
    );

    return payload;
  }

  async editMeetingMessage({
    joinToken,
    userId,
    messageId,
    dto,
  }: EditMeetingMessageParams) {
    const { meeting } =
      await this.meetingPolicyService.assertJoinedMeetingParticipant({
        joinToken,
        userId,
      });
    const content = dto.content.trim();

    if (!content) {
      throw new BadRequestException(
        MEETING_ERROR_MESSAGES.MESSAGE_CONTENT_REQUIRED,
      );
    }

    const message = await this.getMeetingMessageOrThrow(meeting.id, messageId);
    this.assertMessageOwner(message.senderId, userId, 'edit');

    if (message.recalled) {
      throw new BadRequestException(MEETING_ERROR_MESSAGES.MESSAGE_RECALLED);
    }

    this.assertWithinUpdateWindow(
      message.createdAt,
      MEETING_ERROR_MESSAGES.MESSAGE_EDIT_WINDOW_EXPIRED,
    );

    const updatedMessage = await this.prisma.meetingMessage.update({
      where: { id: messageId },
      data: {
        content,
        edited: true,
      },
      include: this.getMessageInclude(),
    });
    const payload = await this.mapMeetingMessagePayload(updatedMessage);

    this.meetingRealtimeService.emitMeetingEvent(
      meeting.id,
      MeetingEvent.MESSAGE_UPDATED,
      payload,
    );

    return payload;
  }

  async recallMeetingMessage({
    joinToken,
    userId,
    messageId,
  }: TargetMeetingMessageParams) {
    const { meeting } =
      await this.meetingPolicyService.assertJoinedMeetingParticipant({
        joinToken,
        userId,
      });
    const message = await this.getMeetingMessageOrThrow(meeting.id, messageId);
    this.assertMessageOwner(message.senderId, userId, 'recall');

    if (message.recalled) {
      throw new BadRequestException(MEETING_ERROR_MESSAGES.MESSAGE_RECALLED);
    }

    this.assertWithinUpdateWindow(
      message.createdAt,
      MEETING_ERROR_MESSAGES.MESSAGE_RECALL_WINDOW_EXPIRED,
    );

    for (const media of message.medias) {
      await this.s3Service.deleteFile(media.s3Key);
    }

    const updatedMessage = await this.prisma.$transaction(async (tx) => {
      await tx.meetingReaction.deleteMany({ where: { messageId } });
      await tx.meetingMedia.deleteMany({ where: { messageId } });

      return tx.meetingMessage.update({
        where: { id: messageId },
        data: {
          recalled: true,
          content: null,
        },
        include: this.getMessageInclude(),
      });
    });
    const payload = await this.mapMeetingMessagePayload(updatedMessage);

    this.meetingRealtimeService.emitMeetingEvent(
      meeting.id,
      MeetingEvent.MESSAGE_UPDATED,
      payload,
    );

    return payload;
  }

  async reactMeetingMessage({
    joinToken,
    userId,
    messageId,
    dto,
  }: ReactMeetingMessageParams) {
    const { meeting } =
      await this.meetingPolicyService.assertJoinedMeetingParticipant({
        joinToken,
        userId,
      });
    const message = await this.getMeetingMessageOrThrow(meeting.id, messageId);

    if (message.recalled) {
      throw new BadRequestException(MEETING_ERROR_MESSAGES.MESSAGE_RECALLED);
    }

    const existingReaction = await this.prisma.meetingReaction.findFirst({
      where: { messageId, userId },
    });
    let action: 'add' | 'remove' | 'update' = 'add';

    if (existingReaction?.emoji === dto.emoji) {
      action = 'remove';
      await this.prisma.meetingReaction.delete({
        where: { id: existingReaction.id },
      });
    } else if (existingReaction) {
      action = 'update';
      await this.prisma.meetingReaction.update({
        where: { id: existingReaction.id },
        data: { emoji: dto.emoji },
      });
    } else {
      await this.prisma.meetingReaction.create({
        data: { messageId, userId, emoji: dto.emoji },
      });
    }

    const updatedMessage = await this.getMeetingMessageOrThrow(
      meeting.id,
      messageId,
    );
    const payload = await this.mapMeetingMessagePayload(updatedMessage);

    this.meetingRealtimeService.emitMeetingEvent(
      meeting.id,
      MeetingEvent.MESSAGE_UPDATED,
      payload,
    );

    return { action, emoji: dto.emoji };
  }

  async removeMeetingMessageReaction({
    joinToken,
    userId,
    messageId,
    dto,
  }: ReactMeetingMessageParams) {
    const { meeting } =
      await this.meetingPolicyService.assertJoinedMeetingParticipant({
        joinToken,
        userId,
      });
    const message = await this.getMeetingMessageOrThrow(meeting.id, messageId);

    if (message.recalled) {
      throw new BadRequestException(MEETING_ERROR_MESSAGES.MESSAGE_RECALLED);
    }

    await this.prisma.meetingReaction.deleteMany({
      where: { messageId, userId, emoji: dto.emoji },
    });
    const updatedMessage = await this.getMeetingMessageOrThrow(
      meeting.id,
      messageId,
    );
    const payload = await this.mapMeetingMessagePayload(updatedMessage);

    this.meetingRealtimeService.emitMeetingEvent(
      meeting.id,
      MeetingEvent.MESSAGE_UPDATED,
      payload,
    );

    return { action: 'remove', emoji: dto.emoji };
  }

  async markMeetingMessageAsRead({
    joinToken,
    userId,
    dto,
  }: ReadMeetingMessageParams) {
    const { meeting } =
      await this.meetingPolicyService.assertJoinedMeetingParticipant({
        joinToken,
        userId,
      });
    await this.getMeetingMessageOrThrow(meeting.id, dto.messageId);

    const readAt = new Date();
    await this.prisma.meetingParticipant.update({
      where: {
        meetingId_userId: {
          meetingId: meeting.id,
          userId,
        },
      },
      data: {
        lastReadMessageId: dto.messageId,
        lastReadAt: readAt,
      },
    });

    const payload = {
      meetingId: meeting.id,
      joinToken,
      messageId: dto.messageId,
      userId,
      readAt: readAt.toISOString(),
    };

    this.meetingRealtimeService.emitMeetingEvent(
      meeting.id,
      MeetingEvent.MESSAGE_READ,
      payload,
    );

    return payload;
  }

  private getMessageInclude() {
    return {
      medias: true,
      reactions: true,
    };
  }

  private async getMessagesPage(
    meetingId: string,
    limit: number,
    cursor: string | undefined,
    order: 'asc' | 'desc',
    cursorKey: 'nextCursor' | 'prevCursor',
  ) {
    const messages = await this.prisma.meetingMessage.findMany({
      where: {
        meetingId,
        deletedAt: null,
      },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: order },
      include: this.getMessageInclude(),
    });

    let pageCursor: string | undefined;
    if (messages.length > limit) {
      const nextItem = messages.pop();
      pageCursor = nextItem?.id;
    }

    const pageMessages = order === 'desc' ? messages.reverse() : messages;

    return {
      messages: await this.mapMeetingMessagePayloads(pageMessages),
      nextCursor: cursorKey === 'nextCursor' ? pageCursor : undefined,
      prevCursor: cursorKey === 'prevCursor' ? pageCursor : undefined,
    };
  }

  private async getMessagesAround(
    meetingId: string,
    limit: number,
    cursor: string,
  ) {
    const halfLimit = Math.floor(limit / 2);
    const include = this.getMessageInclude();
    const [targetMessage, olderMessages, newerMessages] = await Promise.all([
      this.prisma.meetingMessage.findFirst({
        where: { id: cursor, meetingId, deletedAt: null },
        include,
      }),
      this.prisma.meetingMessage.findMany({
        where: { meetingId, deletedAt: null },
        take: halfLimit + 1,
        skip: 1,
        cursor: { id: cursor },
        orderBy: { createdAt: 'desc' },
        include,
      }),
      this.prisma.meetingMessage.findMany({
        where: { meetingId, deletedAt: null },
        take: halfLimit + 1,
        skip: 1,
        cursor: { id: cursor },
        orderBy: { createdAt: 'asc' },
        include,
      }),
    ]);

    let nextCursor: string | undefined;
    if (olderMessages.length > halfLimit) {
      const nextItem = olderMessages.pop();
      nextCursor = nextItem?.id;
    }

    let prevCursor: string | undefined;
    if (newerMessages.length > halfLimit) {
      const prevItem = newerMessages.pop();
      prevCursor = prevItem?.id;
    }

    const messages = [
      ...olderMessages.reverse(),
      ...(targetMessage ? [targetMessage] : []),
      ...newerMessages,
    ];

    return {
      messages: await this.mapMeetingMessagePayloads(messages),
      nextCursor,
      prevCursor,
    };
  }

  private async getMeetingMessageOrThrow(meetingId: string, messageId: string) {
    const message = await this.prisma.meetingMessage.findFirst({
      where: {
        id: messageId,
        meetingId,
        deletedAt: null,
      },
      include: this.getMessageInclude(),
    });

    if (!message) {
      throw new NotFoundException(MEETING_ERROR_MESSAGES.MESSAGE_NOT_FOUND);
    }

    return message;
  }

  private async mapMeetingMessagePayloads<
    T extends { senderId: string; medias?: unknown[] },
  >(messages: T[]) {
    const mappedMessages = messages.map((message) => ({
      ...message,
      medias: mapMediaWithUrl(message.medias ?? []),
    }));

    return this.userProfileSnapshotService.attachSenderProfilesToMessages(
      mappedMessages,
    );
  }

  private async mapMeetingMessagePayload<
    T extends { senderId: string; medias?: unknown[] },
  >(message: T) {
    const [mappedMessage] = await this.mapMeetingMessagePayloads([message]);
    return mappedMessage;
  }

  private assertMessageOwner(
    senderId: string,
    userId: string,
    action: 'edit' | 'recall',
  ) {
    if (senderId === userId) return;

    throw new ForbiddenException(
      action === 'edit'
        ? MEETING_ERROR_MESSAGES.MESSAGE_EDIT_FORBIDDEN
        : MEETING_ERROR_MESSAGES.MESSAGE_RECALL_FORBIDDEN,
    );
  }

  private assertWithinUpdateWindow(createdAt: Date, errorMessage: string) {
    if (Date.now() - createdAt.getTime() <= MESSAGE_UPDATE_WINDOW_MS) return;

    throw new BadRequestException(errorMessage);
  }
}
