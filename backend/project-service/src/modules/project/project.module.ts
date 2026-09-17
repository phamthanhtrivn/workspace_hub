import { Module } from "@nestjs/common";
import { ProjectController } from "./project.controller";
import { ProjectAccessService } from "./project-access.service";
import { ProjectService } from "./project.service";
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
  ],
  exports: [
    ProjectService,
    ProjectAccessService,
  ],
})
export class ProjectModule {}
