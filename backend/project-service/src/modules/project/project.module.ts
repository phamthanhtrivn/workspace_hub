import { ProjectAccessModule } from "./project-access.module";
import { ProjectQueryService } from "./project-query.service";
import { ProjectChatWorkflowService } from "./project-chat-workflow.service";
import { ProjectDocumentWorkflowService } from "./project-document-workflow.service";
import { ProjectEventPublisher } from "./project-event-publisher.service";
import { ProjectMutationService } from "./project-mutation.service";
import { ProjectAccessSyncWorker } from "./project-access-sync.worker";
import { Module } from "@nestjs/common";
import { ProjectController } from "./project.controller";

import { ProjectService } from "./project.service";
import { HttpJsonClient } from "../../common/adapters/http-json.client";
import { SocketModule } from "../socket/socket.module";
import { UserProfileSnapshotModule } from "../user-profile-snapshot/user-profile-snapshot.module";
import { ProjectDocumentClient } from "./project-document.client";
import { ProjectSpaceClient } from "./project-space.client";

@Module({
  imports: [ProjectAccessModule, SocketModule, UserProfileSnapshotModule],
  controllers: [ProjectController],
  providers: [
    ProjectService,
    ProjectQueryService,
    ProjectChatWorkflowService,
    ProjectDocumentWorkflowService,
    ProjectEventPublisher,
    ProjectMutationService,
    ProjectAccessSyncWorker,
    ProjectDocumentClient,
    ProjectSpaceClient,
    HttpJsonClient,
  ],
  exports: [ProjectAccessModule, ProjectService, ProjectSpaceClient],
})
export class ProjectModule {}
