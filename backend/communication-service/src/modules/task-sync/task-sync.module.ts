import { Module } from '@nestjs/common';
import { SocketPublishingModule } from '../socket/socket-publishing.module';
import { TaskSyncConsumer } from './task-sync.consumer';
import { TaskSyncService } from './task-sync.service';
import { UserEventInterceptor } from '../../infrastructure/kafka/user-event.interceptor';
@Module({
  imports: [SocketPublishingModule],
  controllers: [TaskSyncConsumer],
  providers: [TaskSyncService, UserEventInterceptor],
})
export class TaskSyncModule {}
