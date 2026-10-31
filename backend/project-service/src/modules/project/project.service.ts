import { Injectable } from "@nestjs/common";
import { CreateProjectDto } from "./dto/create-project.dto";
import { InternalRenameProjectDto } from "./dto/internal-rename-project.dto";
import { ProjectListQueryDto } from "./dto/project-list-query.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { ProjectAccessService } from "./project-access.service";
import { InternalDocumentEventDto } from "./dto/internal-document-event.dto";
import { InternalProjectSpaceEventDto } from "./dto/internal-project-space-event.dto";
import { ProjectQueryService } from "./project-query.service";
import { ProjectChatWorkflowService } from "./project-chat-workflow.service";
import { ProjectDocumentWorkflowService } from "./project-document-workflow.service";
import { ProjectEventPublisher } from "./project-event-publisher.service";
import { ProjectMutationService } from "./project-mutation.service";

@Injectable()
export class ProjectService {
  constructor(
    private readonly queries: ProjectQueryService,
    private readonly chat: ProjectChatWorkflowService,
    private readonly documents: ProjectDocumentWorkflowService,
    private readonly events: ProjectEventPublisher,
    private readonly mutations: ProjectMutationService,
  ) {}
  async create(userId: string, dto: CreateProjectDto) {
    return this.mutations.create(userId, dto);
  }

  async findAll(userId: string, query: ProjectListQueryDto) {
    return this.queries.findAll(userId, query);
  }

  async getAccessSync(userId: string, projectId: string) {
    return this.queries.getAccessSync(userId, projectId);
  }

  async retryAccessSync(userId: string, projectId: string) {
    return this.mutations.retryAccessSync(userId, projectId);
  }

  async findOne(userId: string, projectId: string) {
    return this.queries.findOne(userId, projectId);
  }

  async openProjectSpace(userId: string, projectId: string) {
    return this.chat.openProjectSpace(userId, projectId);
  }

  async getProjectSpaceStatus(userId: string, projectId: string) {
    return this.chat.getProjectSpaceStatus(userId, projectId);
  }

  async openTaskChannel(userId: string, projectId: string, taskId: string) {
    return this.chat.openTaskChannel(userId, projectId, taskId);
  }

  async openTaskThread(
    userId: string,
    projectId: string,
    taskId: string,
    channelId?: string,
  ) {
    return this.chat.openTaskThread(userId, projectId, taskId, channelId);
  }

  async syncProjectSpaceAccess(
    projectId: string,
    project?: Awaited<ReturnType<ProjectAccessService["findProject"]>>,
    revision?: bigint,
  ) {
    return this.chat.syncProjectSpaceAccess(projectId, project, revision);
  }

  async openProjectDocuments(userId: string, projectId: string) {
    return this.documents.openProjectDocuments(userId, projectId);
  }

  async syncProjectDocumentAccess(
    projectId: string,
    project?: Awaited<ReturnType<ProjectAccessService["findProject"]>>,
    revision?: bigint,
  ) {
    return this.documents.syncProjectDocumentAccess(
      projectId,
      project,
      revision,
    );
  }

  async update(userId: string, projectId: string, dto: UpdateProjectDto) {
    return this.mutations.update(userId, projectId, dto);
  }

  async renameProjectFromSpace(
    projectId: string,
    dto: InternalRenameProjectDto,
  ) {
    return this.mutations.renameProjectFromSpace(projectId, dto);
  }

  async publishDocumentEvent(projectId: string, dto: InternalDocumentEventDto) {
    return this.events.publishDocumentEvent(projectId, dto);
  }

  async publishProjectSpaceEvent(
    projectId: string,
    dto: InternalProjectSpaceEventDto,
  ) {
    return this.events.publishProjectSpaceEvent(projectId, dto);
  }

  async archive(userId: string, projectId: string): Promise<void> {
    return this.mutations.archive(userId, projectId);
  }

  async listMembers(userId: string, projectId: string) {
    return this.queries.listMembers(userId, projectId);
  }
}
