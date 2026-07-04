import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ChatGateway } from './chat.gateway';
import { KAFKA_TOPICS } from '../../common/constants/kafka.constants';

@Controller()
export class NotificationConsumerController {
  constructor(private readonly chatGateway: ChatGateway) {}

  @EventPattern(KAFKA_TOPICS.REALTIME_NOTIFICATION_TOPIC)
  async handleRealtimeNotification(@Payload() data: any) {
    try {
      console.log('Communication Service: Received realtime notification from Kafka:', data);
      
      // If the incoming message is wrapped by Kafkajs value payload
      const notification = data.value || data;
      const { recipientId } = notification;

      if (recipientId) {
        // Emit the notification via Socket.io to the recipient's personal room
        this.chatGateway.server.to(recipientId).emit('new_notification', notification);
        console.log(`WebSocket: Emitted new_notification to user room ${recipientId}`);
      }
    } catch (error) {
      console.error('Failed to forward realtime notification over WebSocket:', error);
    }
  }
}
