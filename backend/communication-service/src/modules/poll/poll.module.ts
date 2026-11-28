import { Module } from '@nestjs/common';
import { PollController } from './poll.controller';
import { PollService } from './poll.service';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';
import { SocketPublishingModule } from '../socket/socket-publishing.module';

@Module({
  imports: [UserProfileSnapshotModule, SocketPublishingModule],
  controllers: [PollController],
  providers: [PollService],
  exports: [PollService],
})
export class PollModule {}
