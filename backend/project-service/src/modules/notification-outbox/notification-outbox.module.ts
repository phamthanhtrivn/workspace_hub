import { Module, forwardRef } from '@nestjs/common';
import { NotificationOutboxService } from './notification-outbox.service';
import { TaskCalendarEventService } from './task-calendar-event.service';
import { ProjectKafkaModule } from '../../infrastructure/kafka/project-kafka.module';
import { InvitationModule } from '../invitation/invitation.module';
import { ProjectModule } from '../project/project.module';
import { HttpJsonClient } from '../../common/communication/http-json.client';
import {
  NOTIFICATION_GATEWAY,
  USER_DIRECTORY,
} from '../project/communication/project-communication.port';
import { HttpNotificationAdapter } from '../project/communication/http-notification.adapter';
import { HttpUserDirectoryAdapter } from '../project/communication/http-user-directory.adapter';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';

@Module({
  imports: [
    ProjectKafkaModule,
    forwardRef(() => InvitationModule),
    forwardRef(() => ProjectModule),
    UserProfileSnapshotModule,
  ],
  providers: [
    NotificationOutboxService,
    TaskCalendarEventService,
    HttpJsonClient,
    { provide: USER_DIRECTORY, useClass: HttpUserDirectoryAdapter },
    { provide: NOTIFICATION_GATEWAY, useClass: HttpNotificationAdapter },
  ],
  exports: [NotificationOutboxService, TaskCalendarEventService],
})
export class NotificationOutboxModule {}
