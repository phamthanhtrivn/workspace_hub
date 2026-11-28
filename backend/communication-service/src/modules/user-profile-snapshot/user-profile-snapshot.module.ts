import { UserEventInterceptor } from '../../infrastructure/kafka/user-event.interceptor';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UserProfileSnapshotConsumer } from './user-profile-snapshot.consumer';
import { UserProfileSnapshotService } from './user-profile-snapshot.service';

@Module({
  imports: [PrismaModule],
  controllers: [UserProfileSnapshotConsumer],
  providers: [UserProfileSnapshotService, UserEventInterceptor],
  exports: [UserProfileSnapshotService],
})
export class UserProfileSnapshotModule {}
