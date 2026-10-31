import { Module } from '@nestjs/common';
import { SocketPublishingModule } from '../socket/socket-publishing.module';
import { TaskSyncConsumer } from './task-sync.consumer';
import { TaskSyncService } from './task-sync.service';
@Module({
  imports: [SocketPublishingModule],
  controllers: [TaskSyncConsumer],
  providers: [TaskSyncService],
})
export class TaskSyncModule {}
