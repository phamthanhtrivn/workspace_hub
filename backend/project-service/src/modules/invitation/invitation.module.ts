import { Module } from "@nestjs/common";
import { InvitationController } from "./invitation.controller";
import { InvitationService } from "./invitation.service";
import { InvitationDeliveryModule } from "../invitation-delivery/invitation-delivery.module";
import { ProjectModule } from "../project/project.module";
import { NotificationOutboxModule } from "../notification-outbox/notification-outbox.module";
import { UserProfileSnapshotModule } from "../user-profile-snapshot/user-profile-snapshot.module";

@Module({
  imports: [
    InvitationDeliveryModule,
    ProjectModule,
    NotificationOutboxModule,
    UserProfileSnapshotModule,
  ],
  controllers: [InvitationController],
  providers: [InvitationService],
  exports: [InvitationService, InvitationDeliveryModule],
})
export class InvitationModule {}
