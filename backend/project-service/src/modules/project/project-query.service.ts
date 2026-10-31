import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ProjectMemberStatus, TaskStatus } from "./project.enums";
import { PrismaService } from "../../common/prisma/prisma.service";
import { ProjectListQueryDto } from "./dto/project-list-query.dto";
import { ProjectAccessService } from "./project-access.service";
import { PROJECT_LIST_PAGE_SIZE } from "./project.constants";
import { toMemberResponse, toProjectResponse } from "./project.mapper";
import { paginate } from "../../common/utils/pagination";
import { UserProfileSnapshotService } from "../user-profile-snapshot/user-profile-snapshot.service";

@Injectable()
export class ProjectQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userProfiles: UserProfileSnapshotService,
    private readonly access: ProjectAccessService,
  ) {}
  async findAll(userId: string, query: ProjectListQueryDto) {
    const listQuery = {
      ...query,
      page: query.page ?? 1,
      limit: Math.min(
        query.limit ?? PROJECT_LIST_PAGE_SIZE,
        PROJECT_LIST_PAGE_SIZE,
      ),
    };
    const search = query.search?.trim();
    const where: Prisma.ProjectWhereInput = {
      archived: false,
      ...(query.status ? { status: query.status } : {}),
      ...(query.hasAssignedTasks
        ? {
            tasks: {
              some: {
                archived: false,
                deletedAt: null,
                assignees: { some: { userId } },
              },
            },
          }
        : {}),
      AND: [
        {
          OR: [
            { ownerId: userId },
            {
              members: {
                some: { userId, status: ProjectMemberStatus.ACTIVE },
              },
            },
          ],
        },
        ...(search
          ? [
              {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  {
                    description: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                ],
              } satisfies Prisma.ProjectWhereInput,
            ]
          : []),
      ],
    };
    const [total, projects] = await this.prisma.$transaction([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        include: { setting: true },
        skip: (listQuery.page - 1) * listQuery.limit,
        take: listQuery.limit,
      }),
    ]);
    const projectIds = projects.map((project) => project.id);
    const ownerIds = [...new Set(projects.map((project) => project.ownerId))];
    const [taskCounts, ownerProfiles] = await Promise.all([
      projectIds.length === 0
        ? []
        : this.prisma.task.groupBy({
            by: ["projectId", "status"],
            where: {
              projectId: { in: projectIds },
              archived: false,
              deletedAt: null,
            },
            _count: { _all: true },
          }),
      this.userProfiles.getProfilesByUserIds(ownerIds),
    ]);

    const statsByProject = new Map<
      string,
      { total: number; completed: number }
    >();
    for (const count of taskCounts) {
      const stats = statsByProject.get(count.projectId) ?? {
        total: 0,
        completed: 0,
      };
      stats.total += count._count._all;
      if (count.status === TaskStatus.DONE)
        stats.completed += count._count._all;
      statsByProject.set(count.projectId, stats);
    }
    return paginate(
      projects.map((project) => {
        const stats = statsByProject.get(project.id);
        const ownerProfile = ownerProfiles.get(project.ownerId);
        return toProjectResponse(
          project,
          {
            totalTaskCount: stats?.total ?? 0,
            completedTaskCount: stats?.completed ?? 0,
          },
          ownerProfile,
        );
      }),
      total,
      listQuery,
    );
  }

  async getAccessSync(userId: string, projectId: string) {
    await this.access.requireReadAccess(userId, projectId);
    const job = await this.prisma.projectAccessSyncJob.findUnique({
      where: { projectId },
    });
    return {
      projectId,
      documents: job?.documentStatus ?? "PENDING",
      chat: job?.chatStatus ?? "PENDING",
      message: job?.lastError ?? null,
    };
  }

  async findOne(userId: string, projectId: string) {
    const project = await this.access.requireReadAccess(userId, projectId);
    const ownerProfile = await this.userProfiles.getProfileByUserId(
      project.ownerId,
    );
    return {
      ...toProjectResponse(project, {}, ownerProfile),
      accessSync: await this.getAccessSync(userId, projectId),
    };
  }

  async listMembers(userId: string, projectId: string) {
    await this.access.requireReadAccess(userId, projectId);
    const members = await this.prisma.projectMember.findMany({
      where: { projectId, status: ProjectMemberStatus.ACTIVE },
      orderBy: { joinedAt: "asc" },
    });

    const userIds = members.map((member) => member.userId);
    const profiles = await this.userProfiles.getProfilesByUserIds(userIds);

    return members.map((member) =>
      toMemberResponse(member, profiles.get(member.userId)),
    );
  }
}
