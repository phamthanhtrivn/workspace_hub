import { Module, forwardRef } from '@nestjs/common';
import { InvitationController } from './invitation.controller';
import { InvitationService } from './invitation.service';
import { InvitationEmailService } from './invitation-email.service';
import { ProjectModule } from '../project/project.module';
import { NotificationOutboxModule } from '../notification-outbox/notification-outbox.module';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';

@Module({
  imports: [
    forwardRef(() => ProjectModule),
    forwardRef(() => NotificationOutboxModule),
    UserProfileSnapshotModule,
  ],
  controllers: [InvitationController],
  providers: [InvitationService, InvitationEmailService],
  exports: [InvitationService, InvitationEmailService],
})
export class InvitationModule {}
