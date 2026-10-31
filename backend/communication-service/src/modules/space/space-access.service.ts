import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SpaceRole } from '@prisma/client';
import { SPACE_ERROR_MESSAGES } from './types/space.enums';

@Injectable()
export class SpaceAccessService {
  constructor(private readonly prisma: PrismaService) {}
  async assertSpaceMember(spaceId: string, userId: string) {
    const member = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId } },
    });
    if (!member) {
      throw new ForbiddenException(SPACE_ERROR_MESSAGES.NOT_MEMBER);
    }
    return member;
  }

  async assertSpaceAdmin(spaceId: string, userId: string) {
    const member = await this.assertSpaceMember(spaceId, userId);
    if (member.role !== SpaceRole.ADMIN) {
      throw new ForbiddenException(SPACE_ERROR_MESSAGES.ADMIN_REQUIRED);
    }
    return member;
  }

  async assertNotProjectSpace(spaceId: string) {
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
      select: { projectId: true },
    });
    if (!space) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.SPACE_NOT_FOUND);
    }
    if (space.projectId) {
      throw new BadRequestException(
        SPACE_ERROR_MESSAGES.PROJECT_SPACE_MANAGED_BY_PROJECT,
      );
    }
  }

  async assertSpaceOwner(spaceId: string, userId: string) {
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
      select: { createdBy: true, name: true, projectId: true },
    });
    if (!space) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.SPACE_NOT_FOUND);
    }
    if (space.createdBy !== userId) {
      throw new ForbiddenException(SPACE_ERROR_MESSAGES.OWNER_REQUIRED);
    }
    return space;
  }

  async assertCanManageSpaceSettings(spaceId: string, userId: string) {
    const [space, member] = await Promise.all([
      this.prisma.space.findUnique({
        where: { id: spaceId },
        select: { createdBy: true, name: true, projectId: true },
      }),
      this.prisma.spaceMember.findUnique({
        where: { spaceId_userId: { spaceId, userId } },
      }),
    ]);

    if (!space) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.SPACE_NOT_FOUND);
    }
    if (!member) {
      throw new ForbiddenException(SPACE_ERROR_MESSAGES.NOT_MEMBER);
    }
    if (space.createdBy === userId) {
      return space;
    }
    if (space.projectId && member.role === SpaceRole.ADMIN) {
      return space;
    }

    throw new ForbiddenException(SPACE_ERROR_MESSAGES.OWNER_REQUIRED);
  }

  async assertCanDeleteSpace(spaceId: string, userId: string) {
    const [space, member] = await Promise.all([
      this.prisma.space.findUnique({
        where: { id: spaceId },
        select: { createdBy: true, name: true, projectId: true },
      }),
      this.prisma.spaceMember.findUnique({
        where: { spaceId_userId: { spaceId, userId } },
      }),
    ]);

    if (!space) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.SPACE_NOT_FOUND);
    }
    if (!member) {
      throw new ForbiddenException(SPACE_ERROR_MESSAGES.NOT_MEMBER);
    }
    if (space.createdBy === userId) {
      return space;
    }
    if (space.projectId && member.role === SpaceRole.ADMIN) {
      return space;
    }

    throw new ForbiddenException(SPACE_ERROR_MESSAGES.OWNER_REQUIRED);
  }

  async assertSpaceAdminOrOwner(spaceId: string, userId: string) {
    const [space, member] = await Promise.all([
      this.prisma.space.findUnique({
        where: { id: spaceId },
        select: { createdBy: true, name: true },
      }),
      this.prisma.spaceMember.findUnique({
        where: { spaceId_userId: { spaceId, userId } },
      }),
    ]);

    if (!space) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.SPACE_NOT_FOUND);
    }
    if (!member) {
      throw new ForbiddenException(SPACE_ERROR_MESSAGES.NOT_MEMBER);
    }

    const isOwner = space.createdBy === userId;
    if (!isOwner && member.role !== SpaceRole.ADMIN) {
      throw new ForbiddenException(SPACE_ERROR_MESSAGES.ADMIN_REQUIRED);
    }

    return { space, member, isOwner };
  }

  async getAdminCount(spaceId: string) {
    return this.prisma.spaceMember.count({
      where: { spaceId, role: SpaceRole.ADMIN },
    });
  }

  async getDefaultChannel(spaceId: string) {
    return this.prisma.channel.findFirst({
      where: { spaceId, isDefault: true },
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}
