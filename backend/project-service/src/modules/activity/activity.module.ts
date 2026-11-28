import { Module } from "@nestjs/common";
import { ActivityController } from "./activity.controller";
import { ActivityService } from "./activity.service";
import { TaskActivityNotificationService } from './task-activity-notification.service';
import { NotificationOutboxModule } from '../notification-outbox/notification-outbox.module';
import { TaskPolicyModule } from "../task/task-policy.module";
import { UserProfileSnapshotModule } from "../user-profile-snapshot/user-profile-snapshot.module";

@Module({
  imports: [TaskPolicyModule, UserProfileSnapshotModule, NotificationOutboxModule],
  controllers: [ActivityController],
  providers: [ActivityService, TaskActivityNotificationService],
  exports: [ActivityService],
})
export class ActivityModule {}
