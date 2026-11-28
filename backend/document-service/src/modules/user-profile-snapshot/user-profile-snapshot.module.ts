import { UserEventInterceptor } from '../../infrastructure/kafka/user-event.interceptor';
import { Module } from '@nestjs/common';
import { UserProfileSnapshotService } from './user-profile-snapshot.service';
import { UserProfileSnapshotConsumer } from './user-profile-snapshot.consumer';

@Module({
  controllers: [UserProfileSnapshotConsumer],
  providers: [UserProfileSnapshotService, UserEventInterceptor],
  exports: [UserProfileSnapshotService],
})
export class UserProfileSnapshotModule {}
