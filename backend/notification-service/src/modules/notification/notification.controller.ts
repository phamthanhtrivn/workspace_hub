import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  UnauthorizedException,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import { NotificationService } from "./notification.service";
import { EmailService } from "./email.service";
import { SendProjectInvitationEmailDto } from "./dtos/send-project-invitation-email.dto";
import { CreateNotificationDto } from "./dtos/create-notification.dto";
import { PushService } from "./push.service";
import { SaveSubscriptionDto } from "./dtos/save-subscription.dto";
import { KAFKA_TOPICS, KAFKA_EVENTS } from "../../common/constants/kafka.constants";

@Controller("api/notifications")
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
    private readonly pushService: PushService,
  ) {}

  @Post("project-invitations/email")
  async sendProjectInvitationEmail(
    @Headers("x-internal-service-key") serviceKey: string,
    @Body() dto: SendProjectInvitationEmailDto,
  ) {
    const expectedKey = process.env.INTERNAL_SERVICE_KEY;

    if (!expectedKey || serviceKey !== expectedKey) {
      throw new UnauthorizedException("Invalid internal service key");
    }

    await this.emailService.sendProjectInvitationEmail(dto);

    return {
      message: "Project invitation email sent successfully",
      data: { sent: true, invitationId: dto.invitationId },
    };
  }

  @Post("internal")
  async createInternalNotification(
    @Headers("x-internal-service-key") serviceKey: string,
    @Body() dto: CreateNotificationDto,
  ) {
    const expectedKey = process.env.INTERNAL_SERVICE_KEY || "local-internal-key";
    if (serviceKey !== expectedKey) {
      throw new UnauthorizedException("Invalid internal service key");
    }
    const notification = await this.notificationService.createNotification(dto);
    return { message: "Notification created successfully", data: notification };
  }
  @EventPattern(KAFKA_TOPICS.NOTIFICATION_TOPIC)
  async handleIncomingNotification(@Payload() data: any) {
    try {
      const payload = data.value || data;

      // Handle message push alerts separately without saving them as database notifications
      if (payload.type === KAFKA_EVENTS.NOTIFICATION.CHAT_NEW_MESSAGE) {
        const recipientIds = payload.recipientIds || [];
        await Promise.all(
          recipientIds.map((recipientId: string) =>
            this.notificationService.sendPushToUser(recipientId, {
              title: payload.title,
              content: payload.content,
              link: payload.link,
              senderName: payload.senderName,
              senderAvatar: payload.senderAvatar,
            }),
          ),
        );
        return;
      }

      await this.notificationService.createNotification({
        recipientId: payload.recipientId,
        senderId: payload.senderId,
        senderName: payload.senderName,
        senderAvatar: payload.senderAvatar,
        type: payload.type,
        title: payload.title,
        content: payload.content,
        link: payload.link,
        metadata: payload.metadata,
      });
    } catch (error) {
      console.error("Failed to process Kafka notification event:", error);
    }
  }


  @Get()
  async getNotifications(
    @Headers("x-user-id") userId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("isRead") isReadStr?: string,
  ) {
    if (!userId) {
      throw new BadRequestException("Missing User Context Header");
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    let isRead: boolean | undefined = undefined;
    if (isReadStr === "true") isRead = true;
    if (isReadStr === "false") isRead = false;

    const result = await this.notificationService.getNotifications(
      userId,
      pageNum,
      limitNum,
      isRead,
    );

    return {
      message: "Notifications retrieved successfully",
      data: result.list,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        unreadCount: result.unreadCount,
      },
    };
  }

  @Get("unread-count")
  async getUnreadCount(@Headers("x-user-id") userId: string) {
    if (!userId) {
      throw new BadRequestException("Missing User Context Header");
    }

    const unreadCount = await this.notificationService.getUnreadCount(userId);
    return {
      message: "Unread notification count retrieved successfully",
      data: { unreadCount },
    };
  }

  @Patch(":id/read")
  async markAsRead(
    @Headers("x-user-id") userId: string,
    @Param("id") notificationId: string,
  ) {
    if (!userId) {
      throw new BadRequestException("Missing User Context Header");
    }

    const notification = await this.notificationService.markAsRead(
      notificationId,
      userId,
    );

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    return {
      message: "Marked as read successfully",
      data: notification,
    };
  }

  @Put("read-all")
  async markAllAsRead(@Headers("x-user-id") userId: string) {
    if (!userId) {
      throw new BadRequestException("Missing User Context Header");
    }

    const count = await this.notificationService.markAllAsRead(userId);
    return {
      message: "Marked all as read successfully",
      data: { modifiedCount: count },
    };
  }

  @Delete(":id")
  async deleteNotification(
    @Headers("x-user-id") userId: string,
    @Param("id") notificationId: string,
  ) {
    if (!userId) {
      throw new BadRequestException("Missing User Context Header");
    }

    const success = await this.notificationService.deleteNotification(
      notificationId,
      userId,
    );

    if (!success) {
      throw new NotFoundException("Notification not found");
    }

    return {
      message: "Notification deleted successfully",
      data: { success },
    };
  }

  @Get("push/vapid-public-key")
  getVapidPublicKey() {
    const publicKey = this.pushService.getPublicKey();
    return {
      message: "VAPID public key retrieved successfully",
      data: { publicKey },
    };
  }

  @Post("push/subscribe")
  @HttpCode(HttpStatus.OK)
  async subscribe(
    @Headers("x-user-id") userId: string,
    @Body() saveSubscriptionDto: SaveSubscriptionDto,
  ) {
    if (!userId) {
      throw new BadRequestException("Missing User Context Header");
    }

    const subscription = await this.notificationService.saveSubscription(
      userId,
      saveSubscriptionDto,
    );

    return {
      message: "Push notification subscription registered successfully",
      data: subscription,
    };
  }

  @Post("push/unsubscribe")
  @HttpCode(HttpStatus.OK)
  async unsubscribe(
    @Headers("x-user-id") userId: string,
    @Body("endpoint") endpoint: string,
  ) {
    if (!userId) {
      throw new BadRequestException("Missing User Context Header");
    }
    if (!endpoint) {
      throw new BadRequestException("Missing endpoint in request body");
    }

    const success = await this.notificationService.unsubscribe(userId, endpoint);

    return {
      message: "Push notification subscription removed successfully",
      data: { success },
    };
  }
}
