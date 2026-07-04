import { Module } from '@nestjs/common';
import { DatabaseModule } from './modules/database/database.module';
import { NotificationModule } from './modules/notification/notification.module';

@Module({
  imports: [
    DatabaseModule,
    NotificationModule,
  ],
})
export class AppModule {}

