import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { taskInclude } from "./task-query";

const taskWithCount = taskInclude;

@Injectable()
export class TaskLookupService {
  constructor(private readonly prisma: PrismaService) {}
  async findTask(taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: taskWithCount,
    });
    if (!task) throw new NotFoundException("Task not found");
    return task;
  }
}
