import {
  Controller,
  Get,
  Patch,
  Put,
  Delete,
  Param,
  Query,
  Headers,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationService } from './notification.service';
import { KAFKA_TOPICS } from '../../common/constants/kafka.constants';

@Controller('api/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // Kafka Consumer
  @EventPattern(KAFKA_TOPICS.NOTIFICATION_TOPIC)
  async handleIncomingNotification(@Payload() data: any) {
    try {
      console.log('Received notification event from Kafka:', data);
      
      // If the incoming message is wrapped by Kafkajs value payload
      const payload = data.value || data;
      
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
      console.error('Failed to process Kafka notification event:', error);
    }
  }

  // REST endpoints for frontend client (Routed through Kong Gateway)
  @Get()
  async getNotifications(
    @Headers('x-user-id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isRead') isReadStr?: string,
  ) {
    if (!userId) {
      throw new BadRequestException('Missing User Context Header');
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    
    let isRead: boolean | undefined = undefined;
    if (isReadStr === 'true') isRead = true;
    if (isReadStr === 'false') isRead = false;

    const result = await this.notificationService.getNotifications(
      userId,
      pageNum,
      limitNum,
      isRead,
    );

    return {
      message: 'Get notifications list successfully',
      data: result.list,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        unreadCount: result.unreadCount,
      },
    };
  }

  @Get('unread-count')
  async getUnreadCount(@Headers('x-user-id') userId: string) {
    if (!userId) {
      throw new BadRequestException('Missing User Context Header');
    }

    const unreadCount = await this.notificationService.getUnreadCount(userId);
    return {
      message: 'Get unread notification count successfully',
      data: { unreadCount },
    };
  }

  @Patch(':id/read')
  async markAsRead(
    @Headers('x-user-id') userId: string,
    @Param('id') notificationId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('Missing User Context Header');
    }

    const notification = await this.notificationService.markAsRead(
      notificationId,
      userId,
    );

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return {
      message: 'Marked notification as read successfully',
      data: notification,
    };
  }

  @Put('read-all')
  async markAllAsRead(@Headers('x-user-id') userId: string) {
    if (!userId) {
      throw new BadRequestException('Missing User Context Header');
    }

    const count = await this.notificationService.markAllAsRead(userId);
    return {
      message: 'Marked all notifications as read successfully',
      data: { modifiedCount: count },
    };
  }

  @Delete(':id')
  async deleteNotification(
    @Headers('x-user-id') userId: string,
    @Param('id') notificationId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('Missing User Context Header');
    }

    const success = await this.notificationService.deleteNotification(
      notificationId,
      userId,
    );

    if (!success) {
      throw new NotFoundException('Notification not found');
    }

    return {
      message: 'Deleted notification successfully',
      data: { success },
    };
  }
}
