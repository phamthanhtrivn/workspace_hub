import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectMemberStatus, ProjectRole } from './project.enums';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { ProjectAccessService } from './project-access.service';
import { toMemberResponse } from './project.mapper';
import { isUniqueConstraintError, rethrowWriteConflict } from '../../common/prisma/prisma-errors';

@Injectable()
export class MemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  async add(userId: string, projectId: string, dto: AddMemberDto) {
    await this.access.requireManager(userId, projectId);
    const now = new Date();

    const reactivated = await this.prisma.projectMember.updateMany({
      where: { projectId, userId: dto.userId, status: { not: ProjectMemberStatus.ACTIVE } },
      data: {
        role: ProjectRole.MEMBER,
        status: ProjectMemberStatus.ACTIVE,
        leftAt: null,
        updatedAt: now,
        version: { increment: 1 },
      },
    });
    if (reactivated.count === 1) {
      const member = await this.prisma.projectMember.findUniqueOrThrow({
        where: { projectId_userId: { projectId, userId: dto.userId } },
      });
      return toMemberResponse(member);
    }

    try {
      const member = await this.prisma.projectMember.create({
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
      return toMemberResponse(member);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('User is already an active project member');
      }
      throw error;
    }
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

    let updated;
    try {
      updated = await this.prisma.projectMember.update({
        where: { id: member.id, version: member.version },
        data: { role: dto.role, updatedAt: new Date(), version: { increment: 1 } },
      });
    } catch (error) {
      rethrowWriteConflict(error, 'Project member was changed by another request');
    }

    return toMemberResponse(updated);
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

    try {
      await this.prisma.projectMember.update({
        where: { id: member.id, version: member.version },
        data: {
          status: ProjectMemberStatus.LEFT,
          leftAt: new Date(),
          updatedAt: new Date(),
          version: { increment: 1 },
        },
      });
    } catch (error) {
      rethrowWriteConflict(error, 'Project member was changed by another request');
    }
  }
}
