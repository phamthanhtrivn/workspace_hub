import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TaskStatus } from "../project/project.enums";
import { PrismaService } from "../../common/prisma/prisma.service";
import { assertTaskEditable } from "./task-edit.guard";

const PARENT_SUBTASK_DEPENDENCY_ERROR =
  "A task cannot depend on its parent or subtask.";

const COMPLETE_SUBTASKS_BEFORE_DONE_ERROR =
  "Complete all subtasks before marking this task as done.";

@Injectable()
export class TaskValidationService {
  constructor(private readonly prisma: PrismaService) {}
  async validateParent(
    projectId: string,
    parentTaskId?: string,
    currentTaskId?: string,
    database: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    if (!parentTaskId) return;
    if (parentTaskId === currentTaskId)
      throw new ConflictException("A task cannot be its own parent");

    const parent = await database.task.findFirst({
      where: { id: parentTaskId, projectId, deletedAt: null },
      select: {
        archived: true,
        parentTaskId: true,
        status: true,
      },
    });
    if (!parent)
      throw new NotFoundException("Parent task not found in this project");
    if (parent.archived)
      throw new ConflictException("An archived task cannot be a parent");
    assertTaskEditable(parent.status);
    if (parent.parentTaskId)
      throw new ConflictException("Only top-level tasks can be parents");
    if (
      currentTaskId &&
      (await database.task.count({
        where: { parentTaskId: currentTaskId, deletedAt: null },
      }))
    ) {
      throw new ConflictException(
        "A task with children cannot become a subtask",
      );
    }
    if (currentTaskId) {
      const dependencyCount = await database.taskDependency.count({
        where: {
          projectId,
          OR: [
            {
              predecessorTaskId: currentTaskId,
              successorTaskId: parentTaskId,
            },
            {
              predecessorTaskId: parentTaskId,
              successorTaskId: currentTaskId,
            },
          ],
        },
      });
      if (dependencyCount > 0) {
        throw new ConflictException(PARENT_SUBTASK_DEPENDENCY_ERROR);
      }
    }
  }

  async assertCanCompleteTaskWithSubtasks(
    taskId: string,
    database: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    const openSubtasks = await database.task.count({
      where: {
        parentTaskId: taskId,
        deletedAt: null,
        archived: false,
        status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] },
      },
    });
    if (openSubtasks > 0) {
      throw new ConflictException(COMPLETE_SUBTASKS_BEFORE_DONE_ERROR);
    }
  }

  async requireActiveMember(projectId: string, userId: string): Promise<void> {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { status: true },
    });
    if (!member || member.status !== "ACTIVE") {
      throw new BadRequestException(
        "Assignee must be an active project member",
      );
    }
  }

  toDate(value?: string | null): Date | null | undefined {
    if (value && value.includes("T") && !/(Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
      throw new BadRequestException(
        "Task timestamps must include a timezone offset",
      );
    }
    return value == null ? value : new Date(value);
  }

  validateDateRange(startDate?: Date | null, dueDate?: Date | null): void {
    if (startDate && dueDate && startDate > dueDate) {
      throw new ConflictException("Start date cannot be after due date");
    }
  }
}
