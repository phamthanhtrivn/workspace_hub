import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { ActivityChange, ActivityService } from "../activity/activity.service";
import { taskInclude } from "./task-query";

@Injectable()
export class TaskActivityService {
  constructor(private readonly activities: ActivityService) {}
  async recordChanges(
    current: Prisma.TaskGetPayload<{ include: typeof taskInclude }>,
    updated: Prisma.TaskGetPayload<{ include: typeof taskInclude }>,
    dto: UpdateTaskDto,
    actorId: string,
    database: Prisma.TransactionClient,
  ) {
    const changes: ActivityChange[] = [];
    if (dto.title !== undefined)
      changes.push(["title", current.title, updated.title]);
    if (dto.description !== undefined)
      changes.push(["description", current.description, updated.description]);
    if (dto.priority !== undefined)
      changes.push(["priority", current.priority, updated.priority]);
    if (dto.status !== undefined)
      changes.push(["status", current.status, updated.status]);
    if (dto.startDate !== undefined)
      changes.push([
        "startDate",
        current.startDate?.toISOString(),
        updated.startDate?.toISOString(),
      ]);
    if (dto.dueDate !== undefined)
      changes.push([
        "dueDate",
        current.dueDate?.toISOString(),
        updated.dueDate?.toISOString(),
      ]);
    if (dto.allDay !== undefined)
      changes.push(["allDay", current.allDay, updated.allDay]);
    if (dto.rank !== undefined)
      changes.push(["rank", current.rank, updated.rank]);
    if (dto.archived !== undefined)
      changes.push(["archived", current.archived, updated.archived]);
    if (dto.parentTaskId !== undefined || dto.clearParent)
      changes.push([
        "parentTaskId",
        current.parentTaskId,
        updated.parentTaskId,
      ]);
    if (dto.assigneeUserId !== undefined)
      changes.push([
        "assigneeUserId",
        current.assignees[0]?.userId,
        dto.assigneeUserId,
      ]);
    await this.activities.recordMany(current.id, actorId, changes, database);
  }
}
