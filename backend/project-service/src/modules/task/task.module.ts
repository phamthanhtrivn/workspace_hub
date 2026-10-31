import { TaskPolicyModule } from "./task-policy.module";
import { TaskLookupService } from "./task-lookup.service";
import { TaskQueryService } from "./task-query.service";
import { TaskAttachmentService } from "./task-attachment.service";
import { TaskValidationService } from "./task-validation.service";
import { TaskActivityService } from "./task-activity.service";
import { TaskCreationService } from "./task-creation.service";
import { TaskMutationService } from "./task-mutation.service";
import { Module } from "@nestjs/common";
import { TaskController } from "./task.controller";
import { TaskService } from "./task.service";
import { ProjectModule } from "../project/project.module";
import { ActivityModule } from "../activity/activity.module";
import { NotificationOutboxModule } from "../notification-outbox/notification-outbox.module";
import { UserProfileSnapshotModule } from "../user-profile-snapshot/user-profile-snapshot.module";
import { HttpJsonClient } from "../../common/adapters/http-json.client";
import { TaskDocumentClient } from "./task-document.client";
import { TaskSyncModule } from "../task-sync/task-sync.module";

@Module({
  imports: [
    TaskPolicyModule,
    TaskSyncModule,
    ProjectModule,
    ActivityModule,
    NotificationOutboxModule,
    UserProfileSnapshotModule,
  ],
  controllers: [TaskController],
  providers: [
    TaskService,
    TaskLookupService,
    TaskQueryService,
    TaskAttachmentService,
    TaskValidationService,
    TaskActivityService,
    TaskCreationService,
    TaskMutationService,
    TaskDocumentClient,
    HttpJsonClient,
  ],
  exports: [TaskService, TaskPolicyModule],
})
export class TaskModule {}
