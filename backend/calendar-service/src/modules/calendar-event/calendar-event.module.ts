import { Module } from '@nestjs/common';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';
import { CalendarEventController } from './calendar-event.controller';
import { CalendarEventService } from './calendar-event.service';
import { CalendarRecurrenceService } from './calendar-recurrence.service';
import { EventAccessPolicy } from './event-access.policy';
import { EventMapper } from './event.mapper';
import { EventRelationService } from './event-relation.service';
import { RecurrenceMutationService } from './recurrence-mutation.service';

@Module({
  imports: [UserProfileSnapshotModule],
  controllers: [CalendarEventController],
  providers: [
    CalendarEventService,
    CalendarRecurrenceService,
    EventAccessPolicy,
    EventMapper,
    EventRelationService,
    RecurrenceMutationService,
  ],
  exports: [CalendarEventService, CalendarRecurrenceService],
})
export class CalendarEventModule {}
