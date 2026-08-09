import {
  Injectable,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { PrismaService } from '../../prisma/prisma.service';
import { InvitationStatus, SpaceRole } from '@prisma/client';
import {
  KAFKA_EVENTS,
  KAFKA_TOPICS,
} from '../../common/constants/kafka.constants';
import { getSenderProfile } from '../../common/utils/user.util';
import { DefaultSpaceChannelNames } from './types/space.types';

@Injectable()
export class SpaceService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('KAFKA_PRODUCER') private readonly kafkaClient: ClientKafka,
  ) {}

  private async mapChannelForClient(channel: any) {
    const roles = await this.prisma.spaceMember.findMany({
      where: {
        spaceId: channel.spaceId,
        userId: { in: channel.members.map((member) => member.userId) },
      },
      select: {
        userId: true,
        role: true,
      },
    });
    const roleByUserId = new Map(roles.map((member) => [member.userId, member.role]));

    return {
      ...channel,
      type: 'GROUP',
      members: channel.members.map((member) => ({
        ...member,
        role: roleByUserId.get(member.userId) ?? SpaceRole.MEMBER,
      })),
    };
  }

  async createSpace(userId: string, name: string) {
    if (!name || name.trim().length === 0) {
      throw new BadRequestException(
        'Space name cannot be empty',
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
        'You are not a member of this space',
      );
    }

    if (!name || name.trim().length === 0) {
      throw new BadRequestException('Channel name cannot be empty');
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

      const createdChannel = await tx.channel.findUnique({
        where: { id: channel.id },
        include: {
          setting: true,
          members: true,
        },
      });
      if (!createdChannel) {
        throw new BadRequestException('Channel creation failed');
      }

      return {
        ...createdChannel,
        type: 'GROUP',
        members: createdChannel.members.map((member) => ({
          ...member,
          role: spaceMembers.find((spaceMember) => spaceMember.userId === member.userId)
            ?.role ?? SpaceRole.MEMBER,
        })),
      };
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
        'You are not a member of this space',
      );
    }

    const channels = await this.prisma.channel.findMany({
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

    return Promise.all(channels.map((channel) => this.mapChannelForClient(channel)));
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
        'You are not allowed to invite members to this space',
      );
    }

    if (!invitedUserIds || invitedUserIds.length === 0) {
      return { count: 0 };
    }

    const invitedByProfile = await getSenderProfile(userId);
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
      select: { name: true },
    });

    return this.prisma.$transaction(async (tx) => {
      const invitationsToNotify: { userId: string; invitationId: string }[] = [];
      const alreadyMembers: string[] = [];
      const alreadyPending: string[] = [];
      for (const invitedId of invitedUserIds) {
        if (!invitedId || invitedId === userId) {
          continue;
        }

        const exists = await tx.spaceMember.findUnique({
          where: {
            spaceId_userId: {
              spaceId,
              userId: invitedId,
            },
          },
        });

        if (exists) {
          alreadyMembers.push(invitedId);
          continue;
        }

        const existingInvitation = await tx.spaceInvitation.findUnique({
          where: {
            spaceId_invitedUserId: {
              spaceId,
              invitedUserId: invitedId,
            },
          },
        });

        if (existingInvitation?.status === InvitationStatus.PENDING) {
          alreadyPending.push(invitedId);
          continue;
        }

        if (existingInvitation) {
          const invitation = await tx.spaceInvitation.update({
            where: { id: existingInvitation.id },
            data: {
              invitedBy: userId,
              status: InvitationStatus.PENDING,
              respondedAt: null,
            },
          });
          invitationsToNotify.push({
            userId: invitedId,
            invitationId: invitation.id,
          });
        } else {
          const invitation = await tx.spaceInvitation.create({
            data: {
              spaceId,
              invitedUserId: invitedId,
              invitedBy: userId,
            },
          });
          invitationsToNotify.push({
            userId: invitedId,
            invitationId: invitation.id,
          });
        }
      }

      return {
        count: invitationsToNotify.length,
        invitationsToNotify,
        alreadyMemberCount: alreadyMembers.length,
        pendingCount: alreadyPending.length,
      };
    }).then((result) => {
      for (const invitation of result.invitationsToNotify) {
        this.kafkaClient.emit(KAFKA_TOPICS.NOTIFICATION_TOPIC, {
          key: invitation.userId,
          value: {
            recipientId: invitation.userId,
            senderId: userId,
            senderName: invitedByProfile.senderName,
            senderAvatar: invitedByProfile.senderAvatar,
            type: KAFKA_EVENTS.NOTIFICATION.CHAT_GROUP_INVITATION,
            title: 'Space invitation',
            content: `You were invited to ${space?.name ?? 'a space'}`,
            link: '/chat',
            metadata: {
              invitationId: invitation.invitationId,
              spaceId,
              spaceName: space?.name,
            },
          },
        });
      }

      return result;
    });
  }
}
