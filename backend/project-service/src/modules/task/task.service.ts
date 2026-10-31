import { Injectable } from "@nestjs/common";
import { CreateTaskDto } from "./dto/create-task.dto";
import { AttachTaskDocumentsDto } from "./dto/attach-task-documents.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { GetProjectTasksQueryDto } from "./dto/get-project-tasks-query.dto";
import { TaskLookupService } from "./task-lookup.service";
import { TaskQueryService } from "./task-query.service";
import { TaskAttachmentService } from "./task-attachment.service";
import { TaskValidationService } from "./task-validation.service";
import { TaskActivityService } from "./task-activity.service";
import { TaskCreationService } from "./task-creation.service";
import { TaskMutationService } from "./task-mutation.service";

@Injectable()
export class TaskService {
  constructor(
    private readonly lookup: TaskLookupService,
    private readonly queries: TaskQueryService,
    private readonly attachments: TaskAttachmentService,
    private readonly validation: TaskValidationService,
    private readonly activity: TaskActivityService,
    private readonly creation: TaskCreationService,
    private readonly mutations: TaskMutationService,
  ) {}
  async create(userId: string, projectId: string, dto: CreateTaskDto) {
    return this.creation.create(userId, projectId, dto);
  }

  async findAll(
    userId: string,
    projectId: string,
    query: GetProjectTasksQueryDto,
  ) {
    return this.queries.findAll(userId, projectId, query);
  }

  async statusCounts(userId: string, projectId: string) {
    return this.queries.statusCounts(userId, projectId);
  }

  async findOne(userId: string, taskId: string) {
    return this.queries.findOne(userId, taskId);
  }

  async listDocuments(userId: string, taskId: string) {
    return this.attachments.listDocuments(userId, taskId);
  }

  async attachDocuments(
    userId: string,
    taskId: string,
    dto: AttachTaskDocumentsDto,
  ) {
    return this.attachments.attachDocuments(userId, taskId, dto);
  }

  async detachDocument(userId: string, taskId: string, attachmentId: string) {
    return this.attachments.detachDocument(userId, taskId, attachmentId);
  }

  async update(userId: string, taskId: string, dto: UpdateTaskDto) {
    return this.mutations.update(userId, taskId, dto);
  }

  async reopen(userId: string, taskId: string) {
    return this.mutations.reopen(userId, taskId);
  }

  async delete(userId: string, taskId: string): Promise<void> {
    return this.mutations.delete(userId, taskId);
  }
}
