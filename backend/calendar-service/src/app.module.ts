import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { CalendarEventModule } from './modules/calendar-event/calendar-event.module';
import { UserProfileSnapshotModule } from './modules/user-profile-snapshot/user-profile-snapshot.module';
import { IntegrationsModule } from './infrastructure/integrations/integrations.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ReminderDispatchModule } from './modules/reminder-dispatch/reminder-dispatch.module';
import { TaskCalendarSyncModule } from './modules/task-calendar-sync/task-calendar-sync.module';

@Module({
  imports: [
    PrismaModule,
    CalendarModule,
    CalendarEventModule,
    UserProfileSnapshotModule,
    IntegrationsModule,
    ScheduleModule.forRoot(),
    ReminderDispatchModule,
    TaskCalendarSyncModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
