import { Injectable, Logger } from '@nestjs/common';
import { AttendeeResponseStatus } from '@prisma/client';

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
  private readonly logger = new Logger(CalendarNotificationService.name);
  private readonly notificationServiceUrl =
    process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:8084';
  private readonly internalServiceKey =
    process.env.INTERNAL_SERVICE_KEY ?? 'chi123nhan123dep123trai@$!';

  async sendNotification(payload: SendNotificationPayload): Promise<void> {
    try {
      const url = new URL(
        '/api/notifications/internal',
        this.notificationServiceUrl,
      );
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-service-key': this.internalServiceKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000),
      });

      if (!response.ok) {
        this.logger.warn(
          `Failed to dispatch calendar notification: HTTP ${response.status}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Calendar notification dispatch error: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
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

