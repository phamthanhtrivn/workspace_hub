import { Module, forwardRef } from '@nestjs/common';
import { NoteController } from './note.controller';
import { NoteService } from './note.service';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [UserProfileSnapshotModule, forwardRef(() => SocketModule)],
  controllers: [NoteController],
  providers: [NoteService],
  exports: [NoteService],
})
export class NoteModule {}
