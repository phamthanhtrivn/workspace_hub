import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { NotificationModule } from './modules/notification/notification.module';

@Module({
  imports: [
    PrismaModule,
    NotificationModule,
  ],
})
export class AppModule {}

