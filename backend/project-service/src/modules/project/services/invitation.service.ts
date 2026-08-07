import { ConflictException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InvitationStatus, ProjectMemberStatus, ProjectRole } from '../project.enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateInvitationDto } from '../dto/create-invitation.dto';
import { ProjectAccessService } from './project-access.service';
import { toInvitationResponse } from '../mappers/project.mapper';
import { InvitationEmailService } from './invitation-email.service';
import { ProjectGateway } from '../events/project.gateway';

const EXPIRY_DAYS = 7;

@Injectable()
export class InvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly email: InvitationEmailService,
    private readonly realtime: ProjectGateway,
  ) {}

  async create(userId: string, projectId: string, dto: CreateInvitationDto) {
    await this.access.requireCanInvite(userId, projectId);
    if (userId === dto.invitedUserId) {
      throw new ConflictException('You cannot invite yourself');
    }
    if (await this.access.isActiveMember(projectId, dto.invitedUserId)) {
      throw new ConflictException('User is already a project member');
    }

    const pending = await this.prisma.projectInvitation.findFirst({
      where: { projectId, invitedUserId: dto.invitedUserId, status: InvitationStatus.PENDING },
    });
    if (pending) {
      throw new ConflictException('A pending invitation already exists for this user');
    }

    const now = new Date();
    const invitation = await this.prisma.projectInvitation.create({
      data: {
        id: crypto.randomUUID(),
        projectId,
        invitedUserId: dto.invitedUserId,
        invitedBy: userId,
        status: InvitationStatus.PENDING,
        createdAt: now,
        expiresAt: new Date(now.getTime() + EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      },
      include: { project: { select: { name: true } } },
    });

    await this.email.sendSafely({
      invitationId: invitation.id,
      projectName: invitation.project.name,
      invitedUserId: dto.invitedUserId,
      inviterId: userId,
      expiresAt: invitation.expiresAt,
    });

    const response = toInvitationResponse(invitation);
    this.realtime.emitDataChanged(projectId, 'invitation', 'created', userId, response);
    return response;
  }

  async findPending(userId: string) {
    const invitations = await this.prisma.projectInvitation.findMany({
      where: { invitedUserId: userId, status: InvitationStatus.PENDING },
      include: { project: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const now = new Date();
    const active = [];

    for (const invitation of invitations) {
      if (invitation.expiresAt && invitation.expiresAt < now) {
        await this.prisma.projectInvitation.update({
          where: { id: invitation.id },
          data: { status: InvitationStatus.EXPIRED, respondedAt: now },
        });
      } else {
        active.push(invitation);
      }
    }

    return active.map(toInvitationResponse);
  }

  async accept(userId: string, invitationId: string) {
    const invitation = await this.findInvitation(invitationId);
    this.requireInvitee(userId, invitation.invitedUserId);
    this.ensurePending(invitation.status, invitation.expiresAt);

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: invitation.projectId,
            userId,
          },
        },
      });
      if (existing?.status === ProjectMemberStatus.ACTIVE) {
        throw new ConflictException('You are already a project member');
      }

      if (existing) {
        await tx.projectMember.update({
          where: { id: existing.id },
          data: { role: ProjectRole.MEMBER, status: ProjectMemberStatus.ACTIVE, leftAt: null, updatedAt: now },
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

      return tx.projectInvitation.update({
        where: { id: invitationId },
        data: { status: InvitationStatus.ACCEPTED, respondedAt: now },
        include: { project: { select: { name: true } } },
      });
    });

    const response = toInvitationResponse(updated);
    this.realtime.emitDataChanged(invitation.projectId, 'invitation', 'updated', userId, response);
    return response;
  }

  async decline(userId: string, invitationId: string) {
    const invitation = await this.findInvitation(invitationId);
    this.requireInvitee(userId, invitation.invitedUserId);
    this.ensurePending(invitation.status, invitation.expiresAt);

    const updated = await this.prisma.projectInvitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.DECLINED, respondedAt: new Date() },
      include: { project: { select: { name: true } } },
    });
    const response = toInvitationResponse(updated);
    this.realtime.emitDataChanged(invitation.projectId, 'invitation', 'updated', userId, response);
    return response;
  }

  async cancel(userId: string, projectId: string, invitationId: string): Promise<void> {
    await this.access.requireCanInvite(userId, projectId);
    const invitation = await this.prisma.projectInvitation.findFirst({ where: { id: invitationId, projectId } });
    if (!invitation) throw new NotFoundException('Invitation not found');
    this.ensurePending(invitation.status, invitation.expiresAt);
    await this.prisma.projectInvitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.CANCELLED, respondedAt: new Date() },
    });
    this.realtime.emitDataChanged(projectId, 'invitation', 'deleted', userId, { id: invitationId });
  }

  private async findInvitation(id: string) {
    const invitation = await this.prisma.projectInvitation.findUnique({
      where: { id },
      include: { project: { select: { name: true } } },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    return invitation;
  }

  private requireInvitee(userId: string, invitedUserId: string): void {
    if (userId !== invitedUserId) throw new ForbiddenException('You cannot manage this invitation');
  }

  private ensurePending(status: string, expiresAt: Date | null): void {
    if (status !== InvitationStatus.PENDING) throw new ConflictException('Invitation has already been processed');
    if (expiresAt && expiresAt < new Date()) throw new ConflictException('Invitation has expired');
  }
}
