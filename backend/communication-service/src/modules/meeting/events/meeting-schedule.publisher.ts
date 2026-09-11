import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import {
  KAFKA_EVENTS,
  KAFKA_TOPICS,
} from '../../../common/constants/kafka.constants';

interface MeetingScheduleSnapshot {
  id: string;
  joinToken: string;
  title: string;
  description?: string | null;
  scheduledStartAt: Date | string;
  scheduledEndAt: Date | string;
  hostUserId: string;
  recipientUserIds: string[];
}

interface MeetingNotificationProfile {
  senderName?: string | null;
  senderAvatar?: string | null;
}

type MeetingInvitationNotificationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'CANCELLED';

@Injectable()
export class MeetingSchedulePublisher {
  constructor(
    @Inject('KAFKA_PRODUCER') private readonly kafkaClient: ClientKafka,
  ) {}

  publishInvitationNotifications(
    meeting: MeetingScheduleSnapshot,
    profile: MeetingNotificationProfile,
  ): void {
    this.publishNotifications({
      meeting,
      recipientIds: meeting.recipientUserIds.filter(
        (recipientId) => recipientId !== meeting.hostUserId,
      ),
      profile,
      type: KAFKA_EVENTS.NOTIFICATION.MEETING_INVITATION,
      title: 'Meeting invitation',
      content: `${this.getSenderName(profile)} invited you to "${meeting.title}" from ${this.formatScheduleRange(meeting)}.`,
      status: 'PENDING',
    });
  }

  publishUpdateNotifications(
    meeting: MeetingScheduleSnapshot,
    profile: MeetingNotificationProfile,
  ): void {
    this.publishNotifications({
      meeting,
      recipientIds: meeting.recipientUserIds.filter(
        (recipientId) => recipientId !== meeting.hostUserId,
      ),
      profile,
      type: KAFKA_EVENTS.NOTIFICATION.MEETING_UPDATED,
      title: 'Meeting updated',
      content: `${this.getSenderName(profile)} updated "${meeting.title}" scheduled for ${this.formatScheduleRange(meeting)}.`,
    });
  }

  publishCancellationNotifications(
    meeting: MeetingScheduleSnapshot,
    profile: MeetingNotificationProfile,
  ): void {
    this.publishNotifications({
      meeting,
      recipientIds: meeting.recipientUserIds.filter(
        (recipientId) => recipientId !== meeting.hostUserId,
      ),
      profile,
      type: KAFKA_EVENTS.NOTIFICATION.MEETING_CANCELLED,
      title: 'Meeting cancelled',
      content: `${this.getSenderName(profile)} cancelled "${meeting.title}" scheduled for ${this.formatScheduleRange(meeting)}.`,
      status: 'CANCELLED',
    });
  }

  publishInvitationStatusUpdate({
    meetingId,
    recipientUserId,
    status,
  }: {
    meetingId: string;
    recipientUserId: string;
    status: MeetingInvitationNotificationStatus;
  }): void {
    this.kafkaClient.emit(KAFKA_TOPICS.NOTIFICATION_TOPIC, {
      key: recipientUserId,
      value: {
        recipientId: recipientUserId,
        type: KAFKA_EVENTS.NOTIFICATION.MEETING_INVITATION_STATUS,
        title: 'Meeting invitation status',
        content: 'Meeting invitation status updated',
        metadata: {
          meetingId,
          status,
          respondedAt: new Date().toISOString(),
        },
      },
    });
  }

  publishInvitationDeclinedNotification(
    meeting: MeetingScheduleSnapshot,
    declinedUserId: string,
    profile: MeetingNotificationProfile,
  ): void {
    this.kafkaClient.emit(KAFKA_TOPICS.NOTIFICATION_TOPIC, {
      key: meeting.hostUserId,
      value: {
        recipientId: meeting.hostUserId,
        senderId: declinedUserId,
        senderName: profile.senderName,
        senderAvatar: profile.senderAvatar,
        type: KAFKA_EVENTS.NOTIFICATION.MEETING_INVITATION_DECLINED,
        title: 'Meeting invitation declined',
        content: `${this.getSenderName(profile)} declined the invitation to "${meeting.title}" scheduled for ${this.formatScheduleRange(meeting)}.`,
        link: `/meetings?tab=upcoming&meeting=${meeting.joinToken}`,
        metadata: {
          ...this.toScheduleMetadata(meeting, 'DECLINED'),
          declinedUserId,
        },
      },
    });
  }

  private publishNotifications({
    meeting,
    recipientIds,
    profile,
    type,
    title,
    content,
    status,
  }: {
    meeting: MeetingScheduleSnapshot;
    recipientIds: string[];
    profile: MeetingNotificationProfile;
    type: string;
    title: string;
    content: string;
    status?: MeetingInvitationNotificationStatus;
  }): void {
    for (const recipientId of new Set(recipientIds)) {
      this.kafkaClient.emit(KAFKA_TOPICS.NOTIFICATION_TOPIC, {
        key: recipientId,
        value: {
          recipientId,
          senderId: meeting.hostUserId,
          senderName: profile.senderName,
          senderAvatar: profile.senderAvatar,
          type,
          title,
          content,
          link: `/meetings/${meeting.joinToken}`,
          metadata: this.toScheduleMetadata(meeting, status),
        },
      });
    }
  }

  private toIso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : value;
  }

  private getSenderName(profile: MeetingNotificationProfile): string {
    return profile.senderName || 'Someone';
  }

  private formatScheduleRange(meeting: MeetingScheduleSnapshot): string {
    const startAt = this.toIso(meeting.scheduledStartAt);
    const endAt = this.toIso(meeting.scheduledEndAt);
    return `${startAt} to ${endAt}`;
  }

  private toScheduleMetadata(
    meeting: MeetingScheduleSnapshot,
    status?: MeetingInvitationNotificationStatus,
  ) {
    return {
      meetingId: meeting.id,
      joinToken: meeting.joinToken,
      hostUserId: meeting.hostUserId,
      title: meeting.title,
      scheduledStartAt: this.toIso(meeting.scheduledStartAt),
      scheduledEndAt: this.toIso(meeting.scheduledEndAt),
      ...(status ? { status } : {}),
    };
  }
}
