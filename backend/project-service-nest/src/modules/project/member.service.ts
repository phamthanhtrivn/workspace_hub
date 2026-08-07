import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectMemberStatus, ProjectRole } from './project.enums';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { ProjectAccessService } from './project-access.service';
import { toMemberResponse } from './project.mapper';
import { ProjectGateway } from './project.gateway';

@Injectable()
export class MemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly realtime: ProjectGateway,
  ) {}

  async add(userId: string, projectId: string, dto: AddMemberDto) {
    await this.access.requireManager(userId, projectId);
    const now = new Date();

    if (await this.access.isActiveMember(projectId, dto.userId)) {
      throw new ConflictException('User is already an active project member');
    }

    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: dto.userId } },
    });

    const member = existing
      ? await this.prisma.projectMember.update({
        where: { id: existing.id },
        data: {
          role: ProjectRole.MEMBER,
          status: ProjectMemberStatus.ACTIVE,
          leftAt: null,
          updatedAt: now,
        },
      })
      : await this.prisma.projectMember.create({
        data: {
          id: crypto.randomUUID(),
          projectId,
          userId: dto.userId,
          role: ProjectRole.MEMBER,
          status: ProjectMemberStatus.ACTIVE,
          joinedAt: now,
          updatedAt: now,
        },
      });

    const response = toMemberResponse(member);
    this.realtime.emitDataChanged(projectId, 'member', 'created', userId, response);
    return response;
  }

  async updateRole(userId: string, projectId: string, memberUserId: string, dto: UpdateMemberRoleDto) {
    await this.access.requireManager(userId, projectId);
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: memberUserId } },
    });

    if (!member || member.status !== ProjectMemberStatus.ACTIVE) {
      throw new NotFoundException('Project member not found');
    }
    if (member.role === ProjectRole.OWNER || dto.role === ProjectRole.OWNER) {
      throw new ConflictException('Project owner role cannot be changed');
    }

    const updated = await this.prisma.projectMember.update({
      where: { id: member.id },
      data: { role: dto.role, updatedAt: new Date() },
    });

    const response = toMemberResponse(updated);
    this.realtime.emitDataChanged(projectId, 'member', 'updated', userId, response);
    return response;
  }

  async remove(userId: string, projectId: string, memberUserId: string): Promise<void> {
    await this.access.requireManager(userId, projectId);
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: memberUserId } },
    });

    if (!member || member.status !== ProjectMemberStatus.ACTIVE) {
      throw new NotFoundException('Project member not found');
    }
    if (member.role === ProjectRole.OWNER) {
      throw new ConflictException('Project owner cannot be removed');
    }

    await this.prisma.projectMember.update({
      where: { id: member.id },
      data: {
        status: ProjectMemberStatus.LEFT,
        leftAt: new Date(),
        updatedAt: new Date(),
      },
    });
    this.realtime.emitDataChanged(projectId, 'member', 'deleted', userId, { userId: memberUserId });
  }
}
