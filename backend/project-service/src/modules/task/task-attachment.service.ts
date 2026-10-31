import {
  BadGatewayException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ServiceHttpError } from "../../common/adapters/http-json.client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AttachTaskDocumentsDto } from "./dto/attach-task-documents.dto";
import { ProjectAccessService } from "../project/project-access.service";
import { ActivityService } from "../activity/activity.service";
import { assertTaskEditable } from "./task-edit.guard";
import { UserProfileSnapshotService } from "../user-profile-snapshot/user-profile-snapshot.service";
import {
  TaskDocumentClient,
  TaskDocumentMetadata,
} from "./task-document.client";
import { TaskDocumentAttachmentSource } from "./task-document.enums";
import { TaskLookupService } from "./task-lookup.service";

const DOCUMENT_REJECTION_STATUSES = new Set<number>([
  HttpStatus.BAD_REQUEST,
  HttpStatus.FORBIDDEN,
  HttpStatus.NOT_FOUND,
  HttpStatus.CONFLICT,
  HttpStatus.PAYLOAD_TOO_LARGE,
  HttpStatus.UNSUPPORTED_MEDIA_TYPE,
  HttpStatus.UNPROCESSABLE_ENTITY,
]);

@Injectable()
export class TaskAttachmentService {
  constructor(
    private readonly access: ProjectAccessService,
    private readonly userProfiles: UserProfileSnapshotService,
    private readonly prisma: PrismaService,
    private readonly activities: ActivityService,
    private readonly taskDocuments: TaskDocumentClient,
    private readonly lookup: TaskLookupService,
  ) {}
  async listDocuments(userId: string, taskId: string) {
    const task = await this.lookup.findTask(taskId);
    await this.access.requireReadAccess(userId, task.projectId);
    return this.toDocumentAttachmentResponses(task.documentAttachments);
  }

  async attachDocuments(
    userId: string,
    taskId: string,
    dto: AttachTaskDocumentsDto,
  ) {
    const task = await this.lookup.findTask(taskId);
    await this.access.requireCanContributeTask(
      userId,
      task.projectId,
      task.createdBy,
      task.assignees.map((assignee) => assignee.userId),
    );
    assertTaskEditable(task.status);

    const documentItemIds = [...new Set(dto.documentItemIds)];
    if (documentItemIds.length !== dto.documentItemIds.length) {
      throw new ConflictException("Duplicate documents cannot be attached");
    }

    const profile = await this.userProfiles.getProfileByUserId(userId);
    const userEmail = profile?.email?.trim() || `${userId}@workspace.local`;
    const documents = await this.resolveTaskDocuments(
      task.projectId,
      userId,
      userEmail,
      documentItemIds,
      dto.source,
      dto.operationId,
    );

    if (documents.length !== documentItemIds.length) {
      throw new BadGatewayException("Unable to resolve all task documents");
    }

    const documentsById = new Map(
      documents.map((document) => [document.id, document]),
    );
    const attachmentsToCreate =
      dto.source === TaskDocumentAttachmentSource.MY_FILES
        ? documents
        : documentItemIds
            .map((documentItemId) => documentsById.get(documentItemId))
            .filter((document): document is TaskDocumentMetadata =>
              Boolean(document),
            );
    const now = new Date();
    const created = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.taskDocumentAttachment.findMany({
        where: {
          taskId,
          documentItemId: {
            in: attachmentsToCreate.map((document) => document.id),
          },
        },
        select: { documentItemId: true },
      });
      if (existing.length > 0) {
        if (existing.length === attachmentsToCreate.length)
          return tx.taskDocumentAttachment.findMany({
            where: {
              taskId,
              documentItemId: {
                in: attachmentsToCreate.map((document) => document.id),
              },
            },
          });
        throw new ConflictException(
          "One or more documents are already attached",
        );
      }

      const attachments = [];
      for (const document of attachmentsToCreate) {
        attachments.push(
          await tx.taskDocumentAttachment.create({
            data: {
              id: crypto.randomUUID(),
              taskId,
              projectId: task.projectId,
              documentItemId: document.id,
              source: dto.source,
              name: document.name,
              mimeType: document.mimeType,
              sizeBytes: BigInt(document.sizeBytes),
              attachedBy: userId,
              createdAt: now,
            },
          }),
        );
      }

      await this.activities.record(
        taskId,
        userId,
        "documents.attached",
        null,
        attachments.map((attachment) => attachment.name),
        tx,
      );

      return attachments;
    });

    return this.toDocumentAttachmentResponses(created);
  }

  async detachDocument(userId: string, taskId: string, attachmentId: string) {
    const task = await this.lookup.findTask(taskId);
    const attachment = task.documentAttachments.find(
      (item) => item.id === attachmentId,
    );
    if (!attachment) {
      throw new NotFoundException("Task document attachment not found");
    }

    await this.access.requireCanContributeTask(
      userId,
      task.projectId,
      task.createdBy,
      task.assignees.map((assignee) => assignee.userId),
    );
    assertTaskEditable(task.status);

    await this.prisma.$transaction(async (tx) => {
      await tx.taskDocumentAttachment.delete({ where: { id: attachmentId } });
      await this.activities.record(
        taskId,
        userId,
        "documents.detached",
        attachment.name,
        null,
        tx,
      );
    });

    return this.toDocumentAttachmentResponse(attachment);
  }

  async resolveTaskDocuments(
    projectId: string,
    userId: string,
    userEmail: string,
    documentItemIds: string[],
    source: TaskDocumentAttachmentSource,
    operationId?: string,
  ): Promise<TaskDocumentMetadata[]> {
    try {
      if (source === TaskDocumentAttachmentSource.MY_FILES) {
        return await this.taskDocuments.importPersonalFiles({
          projectId,
          userId,
          userEmail,
          documentItemIds,
          operationId,
        });
      }

      return await this.taskDocuments.resolveProjectFiles({
        projectId,
        userId,
        userEmail,
        documentItemIds,
      });
    } catch (error) {
      if (
        error instanceof ServiceHttpError &&
        error.status &&
        DOCUMENT_REJECTION_STATUSES.has(error.status)
      ) {
        throw new HttpException(
          "Selected documents cannot be attached. Check their size and access.",
          error.status,
        );
      }
      throw new BadGatewayException("Unable to prepare task documents");
    }
  }

  toDocumentAttachmentResponses(
    attachments: Array<{
      id: string;
      taskId: string;
      projectId: string;
      documentItemId: string;
      source: string;
      name: string;
      mimeType: string | null;
      sizeBytes: bigint | number;
      attachedBy: string;
      createdAt: Date;
    }>,
  ) {
    return attachments.map((attachment) =>
      this.toDocumentAttachmentResponse(attachment),
    );
  }

  toDocumentAttachmentResponse(attachment: {
    id: string;
    taskId: string;
    projectId: string;
    documentItemId: string;
    source: string;
    name: string;
    mimeType: string | null;
    sizeBytes: bigint | number;
    attachedBy: string;
    createdAt: Date;
  }) {
    return {
      ...attachment,
      sizeBytes: Number(attachment.sizeBytes),
    };
  }
}
