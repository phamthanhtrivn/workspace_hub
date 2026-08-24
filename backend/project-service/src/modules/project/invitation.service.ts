import {
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import {
  InvitationStatus,
  ProjectMemberStatus,
  ProjectRole,
} from "./project.enums";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateInvitationDto } from "./dto/create-invitation.dto";
import { ProjectAccessService } from "./project-access.service";
import { toInvitationResponse } from "./project.mapper";
import { isUniqueConstraintError } from "../../common/prisma/prisma-errors";
import { NotificationOutboxService } from "./notification-outbox.service";

const EXPIRY_DAYS = 7;

@Injectable()
export class InvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly notifications: NotificationOutboxService,
  ) {}

  async create(userId: string, projectId: string, dto: CreateInvitationDto) {
    await this.access.requireCanInvite(userId, projectId);
    if (userId === dto.invitedUserId) {
      throw new ConflictException("You cannot invite yourself");
    }
    if (await this.access.isActiveMember(projectId, dto.invitedUserId)) {
      throw new ConflictException("User is already a project member");
    }

    const pending = await this.prisma.projectInvitation.findFirst({
      where: {
        projectId,
        invitedUserId: dto.invitedUserId,
        status: InvitationStatus.PENDING,
      },
    });
    if (pending) {
      throw new ConflictException(
        "A pending invitation already exists for this user",
      );
    }

    const now = new Date();
    let invitation;
    try {
      invitation = await this.prisma.$transaction(async (tx) => {
        const created = await tx.projectInvitation.create({
          data: {
            id: crypto.randomUUID(),
            projectId,
            invitedUserId: dto.invitedUserId,
            invitedBy: userId,
            status: InvitationStatus.PENDING,
            createdAt: now,
            expiresAt: new Date(
              now.getTime() + EXPIRY_DAYS * 24 * 60 * 60 * 1000,
            ),
          },
          include: { project: { select: { name: true } } },
        });
        await this.notifications.enqueueInvitationEmail(
          {
            invitationId: created.id,
            projectName: created.project.name,
            invitedUserId: dto.invitedUserId,
            inviterId: userId,
            expiresAt: created.expiresAt,
          },
          tx,
        );
        await this.notifications.enqueueNotification(
          {
            recipientId: dto.invitedUserId,
            senderId: userId,
            type: "PROJECT_INVITATION",
            title: "Lời mời tham gia dự án",
            content: `Bạn được mời tham gia dự án ${created.project.name}`,
            metadata: {
              invitationId: created.id,
              projectId,
              projectName: created.project.name,
              status: InvitationStatus.PENDING,
              expiresAt: created.expiresAt?.toISOString() ?? null,
            },
          },
          tx,
        );
        return created;
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          "A pending invitation already exists for this user",
        );
      }
      throw error;
    }

    return toInvitationResponse(invitation);
  }

  async findPending(userId: string) {
    const now = new Date();
    await this.prisma.projectInvitation.updateMany({
      where: {
        invitedUserId: userId,
        status: InvitationStatus.PENDING,
        expiresAt: { lt: now },
      },
      data: { status: InvitationStatus.EXPIRED, respondedAt: now },
    });
    const invitations = await this.prisma.projectInvitation.findMany({
      where: { invitedUserId: userId, status: InvitationStatus.PENDING },
      include: { project: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return invitations.map(toInvitationResponse);
  }

  async accept(userId: string, invitationId: string) {
    const initial = await this.findInvitation(invitationId);
    this.requireInvitee(userId, initial.invitedUserId);
    await this.ensurePendingAndPersistExpiry(
      initial.id,
      initial.status,
      initial.expiresAt,
    );

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const invitation = await tx.projectInvitation.findUnique({
        where: { id: invitationId },
        include: { project: { select: { name: true } } },
      });
      if (!invitation) throw new NotFoundException("Invitation not found");
      this.requireInvitee(userId, invitation.invitedUserId);
      this.ensurePending(invitation.status, invitation.expiresAt);

      const claimed = await tx.projectInvitation.updateMany({
        where: { id: invitationId, status: InvitationStatus.PENDING },
        data: { status: InvitationStatus.ACCEPTED, respondedAt: now },
      });
      if (claimed.count !== 1)
        throw new ConflictException("Invitation has already been processed");

      const existing = await tx.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: invitation.projectId,
            userId,
          },
        },
      });
      if (existing?.status === ProjectMemberStatus.ACTIVE) {
        throw new ConflictException("You are already a project member");
      }

      if (existing) {
        await tx.projectMember.update({
          where: { id: existing.id },
          data: {
            role: ProjectRole.MEMBER,
            status: ProjectMemberStatus.ACTIVE,
            leftAt: null,
            updatedAt: now,
          },
        });
      } else {
        await tx.projectMember.create({
          data: {
            id: crypto.randomUUID(),
            projectId: invitation.projectId,
            userId,
            role: ProjectRole.MEMBER,
            status: ProjectMemberStatus.ACTIVE,
            joinedAt: now,
            updatedAt: now,
          },
        });
      }

      await this.notifications.enqueueProjectInvitationStatus(
        invitationId,
        userId,
        InvitationStatus.ACCEPTED,
        tx,
      );

      return tx.projectInvitation.findUniqueOrThrow({
        where: { id: invitationId },
        include: { project: { select: { name: true } } },
      });
    });

    return toInvitationResponse(updated);
  }

  async decline(userId: string, invitationId: string) {
    const invitation = await this.findInvitation(invitationId);
    this.requireInvitee(userId, invitation.invitedUserId);
    await this.ensurePendingAndPersistExpiry(
      invitation.id,
      invitation.status,
      invitation.expiresAt,
    );

    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.projectInvitation.updateMany({
        where: { id: invitationId, status: InvitationStatus.PENDING },
        data: { status: InvitationStatus.DECLINED, respondedAt: new Date() },
      });
      if (changed.count !== 1)
        throw new ConflictException("Invitation has already been processed");
      await this.notifications.enqueueProjectInvitationStatus(
        invitationId,
        userId,
        InvitationStatus.DECLINED,
        tx,
      );
    });
    const updated = await this.findInvitation(invitationId);
    return toInvitationResponse(updated);
  }

  async cancel(
    userId: string,
    projectId: string,
    invitationId: string,
  ): Promise<void> {
    await this.access.requireCanInvite(userId, projectId);
    const invitation = await this.prisma.projectInvitation.findFirst({
      where: { id: invitationId, projectId },
    });
    if (!invitation) throw new NotFoundException("Invitation not found");
    await this.ensurePendingAndPersistExpiry(
      invitation.id,
      invitation.status,
      invitation.expiresAt,
    );
    const changed = await this.prisma.projectInvitation.updateMany({
      where: { id: invitationId, status: InvitationStatus.PENDING },
      data: { status: InvitationStatus.CANCELLED, respondedAt: new Date() },
    });
    if (changed.count !== 1)
      throw new ConflictException("Invitation has already been processed");
  }

  private async findInvitation(id: string) {
    const invitation = await this.prisma.projectInvitation.findUnique({
      where: { id },
      include: { project: { select: { name: true } } },
    });
    if (!invitation) throw new NotFoundException("Invitation not found");
    return invitation;
  }

  private requireInvitee(userId: string, invitedUserId: string): void {
    if (userId !== invitedUserId)
      throw new ForbiddenException("You cannot manage this invitation");
  }

  private ensurePending(status: string, expiresAt: Date | null): void {
    if (status !== InvitationStatus.PENDING)
      throw new ConflictException("Invitation has already been processed");
    if (expiresAt && expiresAt < new Date())
      throw new ConflictException("Invitation has expired");
  }

  private async ensurePendingAndPersistExpiry(
    invitationId: string,
    status: string,
    expiresAt: Date | null,
  ): Promise<void> {
    if (status !== InvitationStatus.PENDING) {
      throw new ConflictException("Invitation has already been processed");
    }
    const now = new Date();
    if (!expiresAt || expiresAt >= now) return;
    await this.prisma.projectInvitation.updateMany({
      where: { id: invitationId, status: InvitationStatus.PENDING },
      data: { status: InvitationStatus.EXPIRED, respondedAt: now },
    });
    throw new ConflictException("Invitation has expired");
  }
}
