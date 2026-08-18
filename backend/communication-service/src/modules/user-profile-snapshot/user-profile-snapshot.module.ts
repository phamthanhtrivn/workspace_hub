import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserProfileSnapshotConsumer } from './user-profile-snapshot.consumer';
import { UserProfileSnapshotService } from './user-profile-snapshot.service';

@Module({
  imports: [PrismaModule],
  controllers: [UserProfileSnapshotConsumer],
  providers: [UserProfileSnapshotService],
  exports: [UserProfileSnapshotService],
})
export class UserProfileSnapshotModule {}
