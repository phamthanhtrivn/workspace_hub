import { Module } from "@nestjs/common";
import { ProjectController } from "./project.controller";
import { ProjectAccessService } from "./project-access.service";
import { ProjectService } from "./project.service";
import { HttpJsonClient } from "../../common/adapters/http-json.client";
import { SocketModule } from "../socket/socket.module";
import { UserProfileSnapshotModule } from "../user-profile-snapshot/user-profile-snapshot.module";
import { ProjectSpaceClient } from "./project-space.client";

@Module({
  imports: [SocketModule, UserProfileSnapshotModule],
  controllers: [
    ProjectController,
  ],
  providers: [
    ProjectService,
    ProjectAccessService,
    ProjectSpaceClient,
    HttpJsonClient,
  ],
  exports: [
    ProjectService,
    ProjectAccessService,
  ],
})
export class ProjectModule {}
