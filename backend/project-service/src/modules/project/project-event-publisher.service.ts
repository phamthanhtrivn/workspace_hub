import { Injectable } from "@nestjs/common";
import { ProjectAccessService } from "./project-access.service";
import { InternalDocumentEventDto } from "./dto/internal-document-event.dto";
import { InternalProjectSpaceEventDto } from "./dto/internal-project-space-event.dto";
import { ProjectSocketPublisher } from "../socket/project-socket.publisher";

@Injectable()
export class ProjectEventPublisher {
  constructor(
    private readonly access: ProjectAccessService,
    private readonly socketPublisher: ProjectSocketPublisher,
  ) {}
  async publishDocumentEvent(projectId: string, dto: InternalDocumentEventDto) {
    await this.access.findProject(projectId);
    const event = {
      projectId,
      resource: "DOCUMENT" as const,
      action: dto.action,
      actorId: dto.actorId,
      entityId: dto.entityId,
      data: {
        ...(dto.data ?? {}),
        parentFolderId: dto.parentFolderId ?? null,
      },
      occurredAt: new Date().toISOString(),
    };
    this.socketPublisher.publish(event);
    return event;
  }

  async publishProjectSpaceEvent(
    projectId: string,
    dto: InternalProjectSpaceEventDto,
  ) {
    await this.access.findProject(projectId);
    const spaceId = dto.spaceId ?? dto.entityId ?? null;
    const event = {
      projectId,
      resource: "PROJECT_SPACE" as const,
      action: dto.action,
      actorId: dto.actorId,
      entityId: dto.entityId ?? dto.spaceId ?? undefined,
      data: {
        exists: dto.exists ?? dto.action !== "DELETED",
        spaceId,
        channelId: dto.channelId ?? null,
      },
      occurredAt: new Date().toISOString(),
    };
    this.socketPublisher.publish(event);
    return event;
  }
}
