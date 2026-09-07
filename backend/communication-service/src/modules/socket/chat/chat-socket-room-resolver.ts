import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ChatSocketRoomResolver {
  constructor(private readonly prisma: PrismaService) {}

  async getChannelTargetRooms(channelId: string): Promise<string[]> {
    const members = await this.prisma.channelMember.findMany({
      where: { channelId },
      select: { userId: true },
    });

    return [channelId, ...members.map((member) => member.userId)];
  }

  async getDirectTargetRooms(conversationId: string): Promise<string[]> {
    const participants =
      await this.prisma.directConversationParticipant.findMany({
        where: { conversationId },
        select: { userId: true },
      });

    return [
      conversationId,
      ...participants.map((participant) => participant.userId),
    ];
  }

  async getSpaceChannelRooms(spaceId: string): Promise<string[]> {
    const channels = await this.prisma.channel.findMany({
      where: { spaceId },
      select: { id: true },
    });

    return channels.map((channel) => channel.id);
  }

  async getSpaceMemberUserRooms(spaceId: string): Promise<string[]> {
    const members = await this.prisma.spaceMember.findMany({
      where: { spaceId },
      select: { userId: true },
    });

    return members.map((member) => member.userId);
  }
}
