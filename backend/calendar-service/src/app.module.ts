import { APP_GUARD } from '@nestjs/core';
import { JwtIdentityGuard } from './common/guards/jwt-identity.guard';
import { WorkAssistantModule } from './modules/work-assistant/work-assistant.controller';
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
import { HealthController } from './common/health.controller';
import { PomodoroModule } from './modules/pomodoro/pomodoro.module';

@Module({
  imports: [
    WorkAssistantModule,
    PrismaModule,
    CalendarModule,
    CalendarEventModule,
    UserProfileSnapshotModule,
    IntegrationsModule,
    ScheduleModule.forRoot(),
    ReminderDispatchModule,
    PomodoroModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, { provide: APP_GUARD, useClass: JwtIdentityGuard }],
})
export class AppModule {}
