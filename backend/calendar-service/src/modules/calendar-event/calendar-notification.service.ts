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
        ? 'accepted'
        : params.status === AttendeeResponseStatus.DECLINED
          ? 'declined'
          : 'responded to';

    const displayName = params.responderName || 'An attendee';

    await this.sendNotification({
      recipientId: params.recipientId,
      senderId: params.responderId,
      senderName: displayName,
      senderAvatar: params.responderAvatar || undefined,
      type: 'CALENDAR_REMINDER',
      title: 'Event Response',
      content: `${displayName} has ${actionText} the event: ${params.eventTitle}`,
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

    const displayName = params.creatorName || 'A user';

    await this.sendNotification({
      recipientId: params.recipientId,
      senderId: params.creatorId,
      senderName: displayName,
      senderAvatar: params.creatorAvatar || undefined,
      type: 'CALENDAR_REMINDER',
      title: 'Event Invitation',
      content: `${displayName} invited you to the event: ${params.eventTitle}`,
      link: `/calendar?event=${params.eventId}`,
      metadata: {
        eventId: params.eventId,
        eventTitle: params.eventTitle,
        type: 'INVITATION',
      },
    });
  }

  async notifyEventCancellation(params: {
    eventTitle: string;
    eventId: string;
    recipientId: string;
    cancellerId: string;
    cancellerName?: string | null;
    cancellerAvatar?: string | null;
  }): Promise<void> {
    if (!params.recipientId || params.recipientId === params.cancellerId) {
      return;
    }

    const displayName = params.cancellerName || 'A user';

    await this.sendNotification({
      recipientId: params.recipientId,
      senderId: params.cancellerId,
      senderName: displayName,
      senderAvatar: params.cancellerAvatar || undefined,
      type: 'CALENDAR_REMINDER',
      title: 'Event Cancelled',
      content: `${displayName} cancelled the event: ${params.eventTitle}`,
      link: '/calendar',
      metadata: {
        eventId: params.eventId,
        eventTitle: params.eventTitle,
        type: 'CANCELLATION',
      },
    });
  }

  async notifyAttendeeRemoval(params: {
    eventTitle: string;
    eventId: string;
    recipientId: string;
    removerId: string;
    removerName?: string | null;
    removerAvatar?: string | null;
  }): Promise<void> {
    if (!params.recipientId || params.recipientId === params.removerId) {
      return;
    }

    const displayName = params.removerName || 'A user';

    await this.sendNotification({
      recipientId: params.recipientId,
      senderId: params.removerId,
      senderName: displayName,
      senderAvatar: params.removerAvatar || undefined,
      type: 'CALENDAR_REMINDER',
      title: 'Removed from Event',
      content: `${displayName} removed you from the event: ${params.eventTitle}`,
      link: '/calendar',
      metadata: {
        eventId: params.eventId,
        eventTitle: params.eventTitle,
        type: 'ATTENDEE_REMOVED',
      },
    });
  }

  async notifyEventUpdate(params: {
    eventTitle: string;
    eventId: string;
    recipientId: string;
    updaterId: string;
    updaterName?: string | null;
    updaterAvatar?: string | null;
  }): Promise<void> {
    if (!params.recipientId || params.recipientId === params.updaterId) {
      return;
    }

    const displayName = params.updaterName || 'A user';

    await this.sendNotification({
      recipientId: params.recipientId,
      senderId: params.updaterId,
      senderName: displayName,
      senderAvatar: params.updaterAvatar || undefined,
      type: 'CALENDAR_REMINDER',
      title: 'Event Updated',
      content: `${displayName} updated the event: ${params.eventTitle}`,
      link: `/calendar?event=${params.eventId}`,
      metadata: {
        eventId: params.eventId,
        eventTitle: params.eventTitle,
        type: 'EVENT_UPDATED',
      },
    });
  }
}
