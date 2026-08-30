import { Module } from '@nestjs/common';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';
import { CalendarEventController } from './calendar-event.controller';
import { CalendarEventService } from './calendar-event.service';
import { CalendarRecurrenceService } from './calendar-recurrence.service';

@Module({
  imports: [UserProfileSnapshotModule],
  controllers: [CalendarEventController],
  providers: [CalendarEventService, CalendarRecurrenceService],
  exports: [CalendarEventService, CalendarRecurrenceService],
})
export class CalendarEventModule {}
