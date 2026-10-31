import { ChannelVisibility } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CHANNEL_ERROR_MESSAGES } from '../types/channel.enums';

@Injectable()
export class ChannelAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertPrivateAccess(channelId: string, userId?: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { visibility: true, spaceId: true },
    });
    if (!channel)
      throw new NotFoundException(CHANNEL_ERROR_MESSAGES.PRIVATE_ACCESS_DENIED);
    if (channel.visibility !== ChannelVisibility.PRIVATE) {
      const spaceMembership =
        userId &&
        (await this.prisma.spaceMember.findUnique({
          where: { spaceId_userId: { spaceId: channel.spaceId, userId } },
          select: { id: true },
        }));
      if (!spaceMembership)
        throw new NotFoundException(
          CHANNEL_ERROR_MESSAGES.PRIVATE_ACCESS_DENIED,
        );
      return;
    }
    const membership =
      userId &&
      (await this.prisma.channelMember.findFirst({
        where: {
          channelId,
          userId,
          channel: { space: { members: { some: { userId } } } },
        },
        select: { id: true },
      }));
    if (!membership)
      throw new NotFoundException(CHANNEL_ERROR_MESSAGES.PRIVATE_ACCESS_DENIED);
  }
}
