import { Module, forwardRef } from '@nestjs/common';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { TaskPolicyService } from './task-policy.service';
import { ProjectModule } from '../project/project.module';
import { ActivityModule } from '../activity/activity.module';
import { NotificationOutboxModule } from '../notification-outbox/notification-outbox.module';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';
import { HttpJsonClient } from '../../common/adapters/http-json.client';
import { TaskDocumentClient } from './task-document.client';

@Module({
  imports: [
    forwardRef(() => ProjectModule),
    forwardRef(() => ActivityModule),
    forwardRef(() => NotificationOutboxModule),
    UserProfileSnapshotModule,
  ],
  controllers: [TaskController],
  providers: [TaskService, TaskPolicyService, TaskDocumentClient, HttpJsonClient],
  exports: [TaskService, TaskPolicyService],
})
export class TaskModule {}
