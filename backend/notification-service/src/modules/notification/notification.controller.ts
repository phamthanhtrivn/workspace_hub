import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import { NotificationService } from "./notification.service";
import { PushService } from "./push.service";
import { SaveSubscriptionDto } from "./dtos/save-subscription.dto";
import { KAFKA_TOPICS, KAFKA_EVENTS } from "../../common/constants/kafka.constants";

@Controller("api/notifications")
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly pushService: PushService,
  ) {}

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
      message: "Lấy danh sách thông báo thành công",
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
      message: "Lấy số lượng thông báo chưa đọc thành công",
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
      message: "Đánh dấu đã đọc thành công",
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
      message: "Đánh dấu tất cả đã đọc thành công",
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
      message: "Xóa thông báo thành công",
      data: { success },
    };
  }

  @Get("push/vapid-public-key")
  getVapidPublicKey() {
    const publicKey = this.pushService.getPublicKey();
    return {
      message: "Lấy VAPID public key thành công",
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
      message: "Đăng ký nhận thông báo đẩy thành công",
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
      message: "Hủy đăng ký nhận thông báo đẩy thành công",
      data: { success },
    };
  }
}

