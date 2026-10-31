import { enqueueProjectAccessSync } from "./project-access-sync";
import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ProjectMemberStatus, ProjectRole } from "./project.enums";
import { PrismaService } from "../../common/prisma/prisma.service";
import { ProjectAccessService } from "./project-access.service";
import { ProjectSocketPublisher } from "../socket/project-socket.publisher";
import { ProjectSpaceClient, ProjectSpaceRole } from "./project-space.client";

@Injectable()
export class ProjectChatWorkflowService {
  constructor(
    private readonly access: ProjectAccessService,
    private readonly prisma: PrismaService,
    private readonly projectSpaces: ProjectSpaceClient,
    private readonly socketPublisher: ProjectSocketPublisher,
  ) {}
  async openProjectSpace(userId: string, projectId: string) {
    const project = await this.access.requireReadAccess(userId, projectId);
    const status = await this.getProjectSpaceStatus(userId, projectId);
    const member =
      project.ownerId === userId
        ? null
        : await this.access.getActiveMember(projectId, userId);
    const canCreateProjectSpace =
      project.ownerId === userId || member?.role === ProjectRole.ADMIN;
    if (!status.exists && !canCreateProjectSpace) {
      throw new ForbiddenException(
        "Project chat space has not been created yet",
      );
    }

    const members = await this.prisma.projectMember.findMany({
      where: {
        projectId,
        status: ProjectMemberStatus.ACTIVE,
      },
      select: {
        userId: true,
        role: true,
      },
      orderBy: { joinedAt: "asc" },
    });

    const roleByUserId = new Map<string, ProjectSpaceRole>();
    for (const member of members) {
      roleByUserId.set(
        member.userId,
        member.userId === project.ownerId || member.role === ProjectRole.ADMIN
          ? "ADMIN"
          : "MEMBER",
      );
    }
    roleByUserId.set(project.ownerId, "ADMIN");

    try {
      const projectSpace = await this.projectSpaces.ensureProjectSpace({
        projectId,
        syncRevision: (
          await this.prisma.projectAccessSyncJob.findUnique({
            where: { projectId },
          })
        )?.revision.toString(),
        name: project.name,
        ownerId: project.ownerId,
        members: Array.from(roleByUserId.entries()).map(
          ([memberUserId, role]) => ({
            userId: memberUserId,
            role,
          }),
        ),
      });
      this.socketPublisher.publish({
        projectId,
        resource: "PROJECT_SPACE",
        action: status.exists ? "UPDATED" : "CREATED",
        actorId: userId,
        entityId: projectSpace.spaceId,
        data: {
          exists: true,
          spaceId: projectSpace.spaceId,
          channelId: projectSpace.channelId,
        },
        occurredAt: new Date().toISOString(),
      });
      await this.prisma.$transaction((tx) =>
        enqueueProjectAccessSync(tx, projectId),
      );
      return projectSpace;
    } catch {
      throw new BadGatewayException("Unable to open project chat space");
    }
  }

  async getProjectSpaceStatus(userId: string, projectId: string) {
    await this.access.requireReadAccess(userId, projectId);
    try {
      return await this.projectSpaces.getProjectSpaceStatus(projectId);
    } catch {
      throw new BadGatewayException("Unable to load project chat space status");
    }
  }

  async openTaskChannel(userId: string, projectId: string, taskId: string) {
    await this.access.requireReadAccess(userId, projectId);
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId },
      select: { id: true, title: true },
    });
    if (!task) {
      throw new NotFoundException("Task not found in project");
    }

    await this.openProjectSpace(userId, projectId);

    try {
      return await this.projectSpaces.ensureTaskChannel(
        projectId,
        taskId,
        task.title,
        userId,
      );
    } catch {
      throw new BadGatewayException("Unable to open task chat channel");
    }
  }

  async openTaskThread(
    userId: string,
    projectId: string,
    taskId: string,
    channelId?: string,
  ) {
    await this.access.requireReadAccess(userId, projectId);
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId, deletedAt: null },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        version: true,
      },
    });
    if (!task) {
      throw new NotFoundException("Task not found in project");
    }

    await this.openProjectSpace(userId, projectId);

    try {
      return await this.projectSpaces.ensureTaskThread(
        projectId,
        taskId,
        task.title,
        userId,
        channelId,
        task.status,
        task.priority,
        task.dueDate ? task.dueDate.toISOString() : undefined,
        task.version.toString(),
      );
    } catch {
      throw new BadGatewayException("Unable to open task discussion thread");
    }
  }

  async syncProjectSpaceAccess(
    projectId: string,
    project?: Awaited<ReturnType<ProjectAccessService["findProject"]>>,
    revision?: bigint,
  ) {
    const currentProject =
      project ?? (await this.access.findProject(projectId));
    const syncRevision =
      revision?.toString() ??
      (
        await this.prisma.projectAccessSyncJob.findUnique({
          where: { projectId },
        })
      )?.revision.toString();
    let status;
    try {
      status = await this.projectSpaces.getProjectSpaceStatus(projectId);
    } catch {
      throw new BadGatewayException("Unable to load project chat space status");
    }
    if (!status.exists) return status;

    const members = await this.prisma.projectMember.findMany({
      where: {
        projectId,
        status: ProjectMemberStatus.ACTIVE,
      },
      select: {
        userId: true,
        role: true,
      },
      orderBy: { joinedAt: "asc" },
    });

    const roleByUserId = new Map<string, ProjectSpaceRole>();
    for (const member of members) {
      roleByUserId.set(
        member.userId,
        member.userId === currentProject.ownerId ||
          member.role === ProjectRole.ADMIN
          ? "ADMIN"
          : "MEMBER",
      );
    }
    roleByUserId.set(currentProject.ownerId, "ADMIN");

    try {
      return await this.projectSpaces.ensureProjectSpace({
        projectId,
        name: currentProject.name,
        syncRevision,
        ownerId: currentProject.ownerId,
        members: Array.from(roleByUserId.entries()).map(
          ([memberUserId, role]) => ({
            userId: memberUserId,
            role,
          }),
        ),
      });
    } catch {
      throw new BadGatewayException(
        "Unable to sync project chat space members",
      );
    }
  }
}
