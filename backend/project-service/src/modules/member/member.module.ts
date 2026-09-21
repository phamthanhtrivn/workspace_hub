import { Module, forwardRef } from '@nestjs/common';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';
import { ProjectModule } from '../project/project.module';
import { NotificationOutboxModule } from '../notification-outbox/notification-outbox.module';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';

@Module({
  imports: [
    forwardRef(() => ProjectModule),
    forwardRef(() => NotificationOutboxModule),
    UserProfileSnapshotModule,
  ],
  controllers: [MemberController],
  providers: [MemberService],
  exports: [MemberService],
})
export class MemberModule {}
