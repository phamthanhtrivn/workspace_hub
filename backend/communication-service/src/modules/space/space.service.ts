import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SpaceRole } from '@prisma/client';
import { DEFAULT_SPACE_CHANNEL_NAMES } from './types/space.enums';
import { DefaultSpaceChannelNames } from './types/space.types';

@Injectable()
export class SpaceService {
  constructor(private readonly prisma: PrismaService) {}

  async createSpace(userId: string, name: string) {
    if (!name || name.trim().length === 0) {
      throw new BadRequestException(
        'Tên không gian làm việc không được để trống',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const space = await tx.space.create({
        data: {
          name,
          createdBy: userId,
        },
      });

      await tx.spaceMember.create({
        data: {
          spaceId: space.id,
          userId,
          role: SpaceRole.OWNER,
        },
      });

      for (const channelName of DefaultSpaceChannelNames) {
        const channel = await tx.channel.create({
          data: {
            spaceId: space.id,
            name: channelName,
            createdBy: userId,
            isDefault: true,
          },
        });

        await tx.channelSetting.create({
          data: {
            channelId: channel.id,
            allowSendMessage: true,
            allowCreateNote: true,
            allowCreatePoll: true,
            allowPinMessage: true,
          },
        });

        await tx.channelMember.create({
          data: {
            channelId: channel.id,
            userId,
          },
        });
      }

      return space;
    });
  }

  async getUserSpaces(userId: string) {
    return this.prisma.space.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createChannel(userId: string, spaceId: string, name: string) {
    const isMember = await this.prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId,
          userId,
        },
      },
    });

    if (!isMember) {
      throw new BadRequestException(
        'Bạn không phải là thành viên của không gian này',
      );
    }

    if (!name || name.trim().length === 0) {
      throw new BadRequestException('Tên kênh không được để trống');
    }

    return this.prisma.$transaction(async (tx) => {
      const channel = await tx.channel.create({
        data: {
          spaceId,
          name,
          createdBy: userId,
          isDefault: false,
        },
      });

      await tx.channelSetting.create({
        data: {
          channelId: channel.id,
          allowSendMessage: true,
          allowCreateNote: true,
          allowCreatePoll: true,
          allowPinMessage: true,
        },
      });

      const spaceMembers = await tx.spaceMember.findMany({
        where: { spaceId },
      });

      for (const member of spaceMembers) {
        await tx.channelMember.create({
          data: {
            channelId: channel.id,
            userId: member.userId,
          },
        });
      }

      return channel;
    });
  }

  async getSpaceChannels(userId: string, spaceId: string) {
    const isMember = await this.prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId,
          userId,
        },
      },
    });

    if (!isMember) {
      throw new BadRequestException(
        'Bạn không phải là thành viên của không gian này',
      );
    }

    return this.prisma.channel.findMany({
      where: {
        spaceId,
      },
      include: {
        setting: true,
        members: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async inviteMembersToSpace(
    userId: string,
    spaceId: string,
    invitedUserIds: string[],
  ) {
    const requester = await this.prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId,
          userId,
        },
      },
    });

    if (!requester || requester.role === SpaceRole.MEMBER) {
      throw new BadRequestException(
        'Bạn không có quyền mời vào không gian này',
      );
    }

    if (!invitedUserIds || invitedUserIds.length === 0) {
      return { count: 0 };
    }

    return this.prisma.$transaction(async (tx) => {
      const addedMembers: string[] = [];
      for (const invitedId of invitedUserIds) {
        const exists = await tx.spaceMember.findUnique({
          where: {
            spaceId_userId: {
              spaceId,
              userId: invitedId,
            },
          },
        });

        if (!exists) {
          await tx.spaceMember.create({
            data: {
              spaceId,
              userId: invitedId,
              role: SpaceRole.MEMBER,
            },
          });
          addedMembers.push(invitedId);
        }
      }

      if (addedMembers.length > 0) {
        const channels = await tx.channel.findMany({
          where: { spaceId },
        });

        for (const channel of channels) {
          for (const newMemberId of addedMembers) {
            const hasMember = await tx.channelMember.findUnique({
              where: {
                channelId_userId: {
                  channelId: channel.id,
                  userId: newMemberId,
                },
              },
            });

            if (!hasMember) {
              await tx.channelMember.create({
                data: {
                  channelId: channel.id,
                  userId: newMemberId,
                },
              });
            }
          }
        }
      }

      return { count: addedMembers.length };
    });
  }
}
