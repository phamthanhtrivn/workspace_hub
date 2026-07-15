import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';
import { EmailService } from './email.service';

@Module({
  imports: [],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationGateway, EmailService],
  exports: [NotificationService],
})
export class NotificationModule {}
