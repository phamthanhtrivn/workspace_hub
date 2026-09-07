import { Module } from '@nestjs/common';
import { UserProfileSnapshotConsumer } from './user-profile-snapshot.consumer';
import { UserProfileSnapshotService } from './user-profile-snapshot.service';

@Module({
  controllers: [UserProfileSnapshotConsumer],
  providers: [UserProfileSnapshotService],
  exports: [UserProfileSnapshotService],
})
export class UserProfileSnapshotModule {}
