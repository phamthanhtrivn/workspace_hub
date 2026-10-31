import { CalendarEventQueryService } from './calendar-event-query.service';
import { CalendarEventValidationService } from './calendar-event-validation.service';
import { CalendarEventEffectsService } from './calendar-event-effects.service';
import { CalendarEventMutationService } from './calendar-event-mutation.service';
import { CalendarTaskMutationService } from './calendar-task-mutation.service';
import { CalendarAttendeeMutationService } from './calendar-attendee-mutation.service';
import { CalendarConferenceWorkflowService } from './calendar-conference-workflow.service';
import { RecurrenceOccurrenceService } from './recurrence-occurrence.service';
import { RecurrenceCreationService } from './recurrence-creation.service';
import { RecurrenceSingleMutationService } from './recurrence-single-mutation.service';
import { RecurrenceFollowingMutationService } from './recurrence-following-mutation.service';
import { RecurrenceEntireMutationService } from './recurrence-entire-mutation.service';
import { RecurrenceTransactionService } from './recurrence-transaction.service';
import { CalendarConferenceSyncService } from './calendar-conference-sync.service';
import { Module } from '@nestjs/common';
import { KafkaProducerModule } from '../../infrastructure/kafka/kafka-producer.module';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';
import { CalendarEventController } from './calendar-event.controller';
import { CalendarEventService } from './calendar-event.service';
import { CalendarRecurrenceService } from './calendar-recurrence.service';
import { EventAccessPolicy } from './event-access.policy';
import { EventMapper } from './event.mapper';
import { EventRelationService } from './event-relation.service';
import { RecurrenceMutationService } from './recurrence-mutation.service';
import { CalendarNotificationService } from './calendar-notification.service';
import { CalendarNotificationOutboxService } from './calendar-notification-outbox.service';

@Module({
  imports: [KafkaProducerModule, UserProfileSnapshotModule],
  controllers: [CalendarEventController],
  providers: [
    CalendarEventService,
    CalendarEventQueryService,
    CalendarEventValidationService,
    CalendarEventEffectsService,
    CalendarEventMutationService,
    CalendarTaskMutationService,
    CalendarAttendeeMutationService,
    CalendarConferenceWorkflowService,
    CalendarConferenceSyncService,
    CalendarRecurrenceService,
    EventAccessPolicy,
    EventMapper,
    EventRelationService,
    RecurrenceMutationService,
    RecurrenceOccurrenceService,
    RecurrenceCreationService,
    RecurrenceSingleMutationService,
    RecurrenceFollowingMutationService,
    RecurrenceEntireMutationService,
    RecurrenceTransactionService,
    CalendarNotificationService,
    CalendarNotificationOutboxService,
  ],
  exports: [
    CalendarEventService,
    CalendarRecurrenceService,
    CalendarConferenceSyncService,
    CalendarNotificationOutboxService,
  ],
})
export class CalendarEventModule {}
