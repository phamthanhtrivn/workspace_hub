import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClientKafka } from '@nestjs/microservices';
import { Notification, NotificationDocument } from './notification.schema';
import { CreateNotificationDto } from './dtos/create-notification.dto';
import { KAFKA_TOPICS } from '../../common/constants/kafka.constants';

@Injectable()
export class NotificationService implements OnModuleInit {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @Inject('KAFKA_PRODUCER')
    private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    // Connect to Kafka broker on start
    try {
      await this.kafkaClient.connect();
      console.log('Notification Service: Successfully connected to Kafka Producer');
    } catch (error) {
      console.error('Notification Service: Failed to connect to Kafka Producer', error);
    }
  }

  async createNotification(createDto: CreateNotificationDto): Promise<NotificationDocument> {
    const createdNotification = new this.notificationModel(createDto);
    const saved = await createdNotification.save();
    
    // Transform to JSON structure
    const payload = saved.toJSON();

    // Publish to realtime topic for socket-gateway push
    this.kafkaClient.emit(KAFKA_TOPICS.REALTIME_NOTIFICATION_TOPIC, {
      key: payload.recipientId, // Partition key
      value: payload,
    });

    return saved;
  }

  async getNotifications(
    recipientId: string,
    page = 1,
    limit = 20,
    isRead?: boolean,
  ): Promise<{ list: NotificationDocument[]; total: number; unreadCount: number }> {
    const query: any = { recipientId };
    if (isRead !== undefined) {
      query.isRead = isRead;
    }

    const skip = (page - 1) * limit;

    const [list, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(query).exec(),
      this.notificationModel.countDocuments({ recipientId, isRead: false }).exec(),
    ]);

    return { list, total, unreadCount };
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    return this.notificationModel.countDocuments({ recipientId, isRead: false }).exec();
  }

  async markAsRead(id: string, recipientId: string): Promise<NotificationDocument | null> {
    return this.notificationModel
      .findOneAndUpdate(
        { _id: id, recipientId },
        { $set: { isRead: true } },
        { new: true },
      )
      .exec();
  }

  async markAllAsRead(recipientId: string): Promise<number> {
    const result = await this.notificationModel
      .updateMany({ recipientId, isRead: false }, { $set: { isRead: true } })
      .exec();
    return result.modifiedCount;
  }

  async deleteNotification(id: string, recipientId: string): Promise<boolean> {
    const result = await this.notificationModel
      .deleteOne({ _id: id, recipientId })
      .exec();
    return result.deletedCount > 0;
  }
}
