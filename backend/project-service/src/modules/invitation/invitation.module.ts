import { Module } from '@nestjs/common';
import { InvitationController } from './controllers/invitation.controller';
import { InvitationEmailService } from './services/invitation-email.service';
import { InvitationService } from './services/invitation.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule, RealtimeModule],
  controllers: [InvitationController],
  providers: [InvitationService, InvitationEmailService],
  exports: [InvitationService],
})
export class InvitationModule {}
