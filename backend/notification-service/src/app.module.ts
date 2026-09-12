import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { NotificationModule } from './modules/notification/notification.module';
import { HealthController } from './common/health.controller';

@Module({
  imports: [
    PrismaModule,
    NotificationModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

