import { Module } from "@nestjs/common";
import { TaskSyncOutboxService } from "./task-sync-outbox.service";
@Module({
  providers: [TaskSyncOutboxService],
  exports: [TaskSyncOutboxService],
})
export class TaskSyncModule {}
