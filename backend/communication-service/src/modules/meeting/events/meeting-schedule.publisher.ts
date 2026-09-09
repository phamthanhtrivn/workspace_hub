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
      content: `You were invited to ${meeting.title}`,
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
      content: `${meeting.title} was updated`,
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
      content: `${meeting.title} was cancelled`,
    });
  }

  private publishNotifications({
    meeting,
    recipientIds,
    profile,
    type,
    title,
    content,
  }: {
    meeting: MeetingScheduleSnapshot;
    recipientIds: string[];
    profile: MeetingNotificationProfile;
    type: string;
    title: string;
    content: string;
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
          metadata: {
            meetingId: meeting.id,
            joinToken: meeting.joinToken,
            hostUserId: meeting.hostUserId,
            title: meeting.title,
            scheduledStartAt: this.toIso(meeting.scheduledStartAt),
            scheduledEndAt: this.toIso(meeting.scheduledEndAt),
          },
        },
      });
    }
  }

  private toIso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : value;
  }
}
