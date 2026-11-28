import { Module } from "@nestjs/common";
import { NotificationOutboxService } from "./notification-outbox.service";
import { InvitationDeliveryModule } from "../invitation-delivery/invitation-delivery.module";
@Module({
  imports: [InvitationDeliveryModule],
  providers: [NotificationOutboxService],
  exports: [NotificationOutboxService, InvitationDeliveryModule],
})
export class NotificationOutboxModule {}
