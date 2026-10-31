import { BadGatewayException, Injectable } from "@nestjs/common";
import { ProjectMemberStatus, ProjectRole } from "./project.enums";
import { PrismaService } from "../../common/prisma/prisma.service";
import { ProjectAccessService } from "./project-access.service";
import { UserProfileSnapshotService } from "../user-profile-snapshot/user-profile-snapshot.service";
import { ProjectDocumentClient } from "./project-document.client";

@Injectable()
export class ProjectDocumentWorkflowService {
  constructor(
    private readonly access: ProjectAccessService,
    private readonly prisma: PrismaService,
    private readonly userProfiles: UserProfileSnapshotService,
    private readonly projectDocuments: ProjectDocumentClient,
  ) {}
  async openProjectDocuments(userId: string, projectId: string) {
    const project = await this.access.requireReadAccess(userId, projectId);
    return this.syncProjectDocumentAccess(projectId, project);
  }

  async syncProjectDocumentAccess(
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
    const ownerProfile = await this.userProfiles.getProfileByUserId(
      currentProject.ownerId,
    );
    const members = await this.prisma.projectMember.findMany({
      where: { projectId, status: ProjectMemberStatus.ACTIVE },
      select: {
        userId: true,
        role: true,
        canEditDocuments: true,
      },
      orderBy: { joinedAt: "asc" },
    });
    const memberUserIds = members
      .map((member) => member.userId)
      .filter((memberUserId) => memberUserId !== currentProject.ownerId);
    const profiles =
      await this.userProfiles.getProfilesByUserIds(memberUserIds);

    try {
      return await this.projectDocuments.ensureProjectRootFolder({
        projectId,
        name: currentProject.name,
        syncRevision,
        ownerId: currentProject.ownerId,
        ownerEmail: this.resolveOwnerEmail(
          currentProject.ownerId,
          ownerProfile?.email,
        ),
        members: members
          .filter((member) => member.userId !== currentProject.ownerId)
          .map((member) => {
            const profile = profiles.get(member.userId);
            return {
              userId: member.userId,
              email: this.resolveOwnerEmail(member.userId, profile?.email),
              permission:
                member.role === ProjectRole.ADMIN || member.canEditDocuments
                  ? "EDITOR"
                  : "VIEWER",
            };
          }),
      });
    } catch {
      throw new BadGatewayException("Unable to open project documents");
    }
  }

  resolveOwnerEmail(ownerId: string, email?: string | null): string {
    const normalizedEmail = email?.trim();
    return normalizedEmail || `${ownerId}@workspace.local`;
  }
}
