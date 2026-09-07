import { Module } from '@nestjs/common';
import { TaskCalendarSyncConsumer } from './task-calendar-sync.consumer';
import { TaskCalendarSyncService } from './task-calendar-sync.service';

@Module({
  controllers: [TaskCalendarSyncConsumer],
  providers: [TaskCalendarSyncService],
})
export class TaskCalendarSyncModule {}
