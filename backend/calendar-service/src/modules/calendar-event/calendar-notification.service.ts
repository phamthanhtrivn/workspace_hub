import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { AttendeeResponseStatus } from '@prisma/client';
import { lastValueFrom } from 'rxjs';
import { KAFKA_CONFIG } from '../../infrastructure/kafka/kafka.constants';

export interface SendNotificationPayload {
  recipientId: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  type: string;
  title: string;
  content: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class CalendarNotificationService {
  constructor(
    @Inject(KAFKA_CONFIG.PRODUCER_CLIENT)
    private readonly kafka: ClientKafka,
  ) {}

  async sendNotification(payload: SendNotificationPayload): Promise<void> {
    await lastValueFrom(
      this.kafka.emit(KAFKA_CONFIG.NOTIFICATION_TOPIC, {
        key: payload.recipientId,
        value: payload,
      }),
    );
  }

  async notifyAttendeeResponse(params: {
    eventTitle: string;
    eventId: string;
    recipientId: string;
    responderId: string;
    responderName?: string | null;
    responderAvatar?: string | null;
    status: AttendeeResponseStatus;
  }): Promise<void> {
    if (!params.recipientId || params.recipientId === params.responderId) {
      return;
    }

    const actionText =
      params.status === AttendeeResponseStatus.ACCEPTED
        ? 'đồng ý tham gia'
        : params.status === AttendeeResponseStatus.DECLINED
          ? 'từ chối tham gia'
          : 'đã phản hồi về';

    const displayName = params.responderName || 'Một người tham dự';

    await this.sendNotification({
      recipientId: params.recipientId,
      senderId: params.responderId,
      senderName: displayName,
      senderAvatar: params.responderAvatar || undefined,
      type: 'CALENDAR_REMINDER',
      title: 'Phản hồi sự kiện',
      content: `${displayName} đã ${actionText} sự kiện: ${params.eventTitle}`,
      link: `/calendar?event=${params.eventId}`,
      metadata: {
        eventId: params.eventId,
        eventTitle: params.eventTitle,
        responseStatus: params.status,
      },
    });
  }

  async notifyEventInvitation(params: {
    eventTitle: string;
    eventId: string;
    recipientId: string;
    creatorId: string;
    creatorName?: string | null;
    creatorAvatar?: string | null;
  }): Promise<void> {
    if (!params.recipientId || params.recipientId === params.creatorId) {
      return;
    }

    const displayName = params.creatorName || 'Một người dùng';

    await this.sendNotification({
      recipientId: params.recipientId,
      senderId: params.creatorId,
      senderName: displayName,
      senderAvatar: params.creatorAvatar || undefined,
      type: 'CALENDAR_REMINDER',
      title: 'Lời mời sự kiện',
      content: `${displayName} đã mời bạn tham gia sự kiện: ${params.eventTitle}`,
      link: `/calendar?event=${params.eventId}`,
      metadata: {
        eventId: params.eventId,
        eventTitle: params.eventTitle,
        type: 'INVITATION',
      },
    });
  }
}
