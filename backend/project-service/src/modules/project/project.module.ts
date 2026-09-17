import { Module } from "@nestjs/common";
import { ProjectController } from "./project.controller";
import { ProjectAccessService } from "./project-access.service";
import { ProjectService } from "./project.service";
import { HttpJsonClient } from "../../common/adapters/http-json.client";
import {
  NOTIFICATION_GATEWAY,
  USER_DIRECTORY,
} from "../../common/adapters/project-communication.port";
import { HttpNotificationAdapter } from "../../common/adapters/http-notification.adapter";
import { HttpUserDirectoryAdapter } from "../../common/adapters/http-user-directory.adapter";
import { SocketModule } from "../socket/socket.module";
import { UserProfileSnapshotModule } from "../user-profile-snapshot/user-profile-snapshot.module";

@Module({
  imports: [SocketModule, UserProfileSnapshotModule],
  controllers: [
    ProjectController,
  ],
  providers: [
    ProjectService,
    ProjectAccessService,
    HttpJsonClient,
    { provide: USER_DIRECTORY, useClass: HttpUserDirectoryAdapter },
    { provide: NOTIFICATION_GATEWAY, useClass: HttpNotificationAdapter },
  ],
  exports: [
    ProjectService,
    ProjectAccessService,
    USER_DIRECTORY,
    NOTIFICATION_GATEWAY,
    HttpJsonClient,
  ],
})
export class ProjectModule {}
