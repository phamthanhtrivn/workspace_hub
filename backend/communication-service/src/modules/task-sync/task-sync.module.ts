import { Module } from '@nestjs/common';
import { SocketModule } from '../socket/socket.module';
import { TaskSyncConsumer } from './task-sync.consumer';
import { TaskSyncService } from './task-sync.service';
@Module({
  imports: [SocketModule],
  controllers: [TaskSyncConsumer],
  providers: [TaskSyncService],
})
export class TaskSyncModule {}
