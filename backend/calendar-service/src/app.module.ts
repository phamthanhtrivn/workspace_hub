import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { CalendarEventModule } from './modules/calendar-event/calendar-event.module';
import { CalendarSettingModule } from './modules/calendar-setting/calendar-setting.module';
import { UserProfileSnapshotModule } from './modules/user-profile-snapshot/user-profile-snapshot.module';

@Module({
  imports: [
    PrismaModule,
    CalendarModule,
    CalendarEventModule,
    CalendarSettingModule,
    UserProfileSnapshotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
