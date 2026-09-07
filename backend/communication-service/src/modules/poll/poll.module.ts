import { Module, forwardRef } from '@nestjs/common';
import { PollController } from './poll.controller';
import { PollService } from './poll.service';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [UserProfileSnapshotModule, forwardRef(() => SocketModule)],
  controllers: [PollController],
  providers: [PollService],
  exports: [PollService],
})
export class PollModule {}
