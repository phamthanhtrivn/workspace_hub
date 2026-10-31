import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { ProjectAccessService } from "../project/project-access.service";
import { toTaskResponse } from "../project/project.mapper";
import { paginate } from "../../common/utils/pagination";
import { GetProjectTasksQueryDto } from "./dto/get-project-tasks-query.dto";
import {
  buildProjectTaskWhere,
  buildTaskStatusCounts,
  taskInclude,
} from "./task-query";
import { UserProfileSnapshotService } from "../user-profile-snapshot/user-profile-snapshot.service";
import {
  resolveProfilesForItem,
  resolveProfilesForItems,
} from "../../common/utils/profile-mapper.util";
import { TaskLookupService } from "./task-lookup.service";

const taskWithCount = taskInclude;

@Injectable()
export class TaskQueryService {
  constructor(
    private readonly access: ProjectAccessService,
    private readonly prisma: PrismaService,
    private readonly userProfiles: UserProfileSnapshotService,
    private readonly lookup: TaskLookupService,
  ) {}
  async findAll(
    userId: string,
    projectId: string,
    query: GetProjectTasksQueryDto,
  ) {
    await this.access.requireReadAccess(userId, projectId);
    const where = buildProjectTaskWhere(projectId, userId, query);
    const [total, tasks] = await this.prisma.$transaction([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        orderBy: [{ rank: "asc" }, { createdAt: "asc" }],
        include: taskWithCount,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);
    const profiles = await resolveProfilesForItems(
      this.userProfiles,
      tasks,
      (t) => [
        ...(t.assignees?.map((a) => a.userId) ?? []),
        t.createdBy,
        t.reporterId,
      ],
    );
    return paginate(
      tasks.map((task) => toTaskResponse(task, profiles)),
      total,
      query,
    );
  }

  async statusCounts(userId: string, projectId: string) {
    await this.access.requireReadAccess(userId, projectId);
    const rows = await this.prisma.task.groupBy({
      by: ["status"],
      where: {
        projectId,
        archived: false,
        deletedAt: null,
      },
      _count: { _all: true },
    });
    return buildTaskStatusCounts(rows);
  }

  async findOne(userId: string, taskId: string) {
    const task = await this.lookup.findTask(taskId);
    await this.access.requireReadAccess(userId, task.projectId);
    const profiles = await resolveProfilesForItem(
      this.userProfiles,
      task,
      (t) => [
        ...(t.assignees?.map((a) => a.userId) ?? []),
        t.createdBy,
        t.reporterId,
      ],
    );
    return toTaskResponse(task, profiles);
  }
}
