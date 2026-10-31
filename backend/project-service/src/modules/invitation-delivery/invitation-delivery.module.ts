import { Module } from "@nestjs/common";
import { RuntimeConfigModule } from "../../common/config/runtime-config.module";
import { UserProfileSnapshotModule } from "../user-profile-snapshot/user-profile-snapshot.module";
import { HttpJsonClient } from "../../common/adapters/http-json.client";
import { HttpNotificationAdapter } from "../../common/adapters/http-notification.adapter";
import { HttpUserDirectoryAdapter } from "../../common/adapters/http-user-directory.adapter";
import {
  NOTIFICATION_GATEWAY,
  USER_DIRECTORY,
} from "../../common/adapters/project-communication.port";
import { InvitationEmailService } from "./invitation-email.service";
@Module({
  imports: [RuntimeConfigModule, UserProfileSnapshotModule],
  providers: [
    InvitationEmailService,
    HttpJsonClient,
    { provide: USER_DIRECTORY, useClass: HttpUserDirectoryAdapter },
    { provide: NOTIFICATION_GATEWAY, useClass: HttpNotificationAdapter },
  ],
  exports: [
    InvitationEmailService,
    HttpJsonClient,
    USER_DIRECTORY,
    NOTIFICATION_GATEWAY,
  ],
})
export class InvitationDeliveryModule {}
