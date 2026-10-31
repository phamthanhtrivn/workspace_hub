import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Prisma,
  SpaceRole,
  MessageType,
  ChannelVisibility,
} from '@prisma/client';
import { CreateChannelDto } from '../channel/dto/create-channel.dto';
import { PrivateChannelService } from '../channel/private-channel.service';
import {
  createPrivateChannelSystemMessages,
  publishPrivateChannelSystemMessages,
} from '../channel/private-channel-system-messages';
import { PrivateChannelMembershipAction } from '../channel/types/private-channel-system-message.types';
import { ChatEvent } from '../socket/chat/chat-socket.events';
import { ChatSocketPublisher } from '../socket/chat/chat-socket.publisher';
import { SPACE_ERROR_MESSAGES } from './types/space.enums';
import { SpaceSettingsService } from './space-settings.service';
import { SpaceAccessService } from './space-access.service';
import { SpacePresentationService } from './space-presentation.service';

@Injectable()
export class SpaceChannelSynchronizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatSocketPublisher: ChatSocketPublisher,
    private readonly privateChannels: PrivateChannelService,
    private readonly settings: SpaceSettingsService,
    private readonly access: SpaceAccessService,
    private readonly presentation: SpacePresentationService,
  ) {}
  async ensureTaskChannel(
    projectId: string,
    _taskId: string,
    taskTitle: string,
    actorId?: string,
  ) {
    const space = await this.prisma.space.findFirst({
      where: { projectId },
    });
    if (!space) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.SPACE_NOT_FOUND);
    }

    const cleanTitle =
      taskTitle
        ?.toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 30) || 'task';
    const channelName = `task-${cleanTitle}`;

    let channel = await this.prisma.channel.findFirst({
      where: {
        spaceId: space.id,
        name: { equals: channelName, mode: 'insensitive' },
      },
    });

    if (!channel) {
      channel = await this.prisma.channel.create({
        data: {
          spaceId: space.id,
          name: channelName,
          createdBy: actorId || space.createdBy,
        },
      });

      const spaceMembers = await this.prisma.spaceMember.findMany({
        where: { spaceId: space.id },
        select: { userId: true },
      });

      if (spaceMembers.length > 0) {
        await this.prisma.channelMember.createMany({
          data: spaceMembers.map((m) => ({
            channelId: channel!.id,
            userId: m.userId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return {
      spaceId: space.id,
      channelId: channel.id,
      channelName: channel.name,
    };
  }

  async ensureTaskThread(
    projectId: string,
    taskId: string,
    taskTitle: string,
    actorId?: string,
    channelId?: string,
    status?: string,
    priority?: string,
    dueDate?: string,
    version?: string,
  ) {
    if (
      version !== undefined &&
      (!/^(0|[1-9]\d{0,18})$/.test(version) ||
        BigInt(version) > 9223372036854775807n)
    ) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.INVALID_TASK_VERSION);
    }
    const space = await this.prisma.space.findFirst({
      where: { projectId },
    });
    if (!space) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.SPACE_NOT_FOUND);
    }

    const senderId = actorId || space.createdBy;
    let targetChannel: {
      id: string;
      name: string;
      visibility: ChannelVisibility;
    } | null = null;

    if (channelId) {
      const channelCandidate = await this.prisma.channel.findFirst({
        where: { spaceId: space.id, id: channelId },
        include: { setting: true, members: true },
      });
      if (channelCandidate) {
        const isMember = channelCandidate.members.some(
          (m) => m.userId === senderId,
        );
        let canPost = isMember;
        if (isMember && channelCandidate.setting?.allowSendMessage === false) {
          const spaceMem = await this.prisma.spaceMember.findUnique({
            where: { spaceId_userId: { spaceId: space.id, userId: senderId } },
          });
          canPost =
            channelCandidate.visibility === ChannelVisibility.PRIVATE
              ? channelCandidate.ownerId === senderId
              : spaceMem?.role === SpaceRole.ADMIN ||
                space.createdBy === senderId;
        }

        if (canPost) {
          targetChannel = {
            id: channelCandidate.id,
            name: channelCandidate.name,
            visibility: channelCandidate.visibility,
          };
        }
      }
      if (!targetChannel)
        throw new ForbiddenException(
          SPACE_ERROR_MESSAGES.TASK_THREAD_ACCESS_DENIED,
        );
    }

    if (!targetChannel) {
      targetChannel = await this.prisma.channel.findFirst({
        where: {
          spaceId: space.id,
          name: { equals: 'task-discussions', mode: 'insensitive' },
          visibility: ChannelVisibility.PUBLIC,
        },
        select: { id: true, name: true, visibility: true },
      });
    }

    if (!targetChannel) {
      const defaultChannel = await this.prisma.channel.findFirst({
        where: { spaceId: space.id, isDefault: true },
        select: { id: true, name: true, visibility: true },
        orderBy: { createdAt: 'asc' },
      });
      targetChannel = defaultChannel;
    }

    if (!targetChannel) {
      targetChannel = await this.prisma.channel.create({
        data: {
          spaceId: space.id,
          name: 'task-discussions',
          createdBy: senderId,
        },
        select: { id: true, name: true, visibility: true },
      });
    }

    const spaceMembers = await this.prisma.spaceMember.findMany({
      where: { spaceId: space.id },
      select: { userId: true },
    });
    if (
      targetChannel.visibility === ChannelVisibility.PUBLIC &&
      spaceMembers.length > 0
    ) {
      await this.prisma.channelMember.createMany({
        data: spaceMembers.map((m) => ({
          channelId: targetChannel.id,
          userId: m.userId,
        })),
        skipDuplicates: true,
      });
    }

    const taskTag = `[Task #${taskId.slice(0, 8)}]`;
    const rootMessage = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${taskId}, 0))`;
      const latest = await tx.projectTaskSnapshot.findUnique({
        where: { taskId },
      });
      const existing = await tx.message.findFirst({
        where: {
          channelId: targetChannel.id,
          threadParentId: null,
          deletedAt: null,
          recalled: false,
          OR: [
            { content: { contains: taskId } },
            { content: { contains: taskTag } },
          ],
        },
      });

      if (existing) return existing;
      const messageContent = JSON.stringify(
        latest &&
          latest.projectId === projectId &&
          (!version || latest.version >= BigInt(version))
          ? latest.payload
          : {
              type: 'TASK',
              title: taskTitle,
              taskId,
              projectId,
              status: status || undefined,
              priority: priority || undefined,
              dueDate: dueDate || undefined,
              tag: taskTag,
              taskVersion: version,
              deleted: false,
            },
      );

      return tx.message.create({
        data: {
          channelId: targetChannel.id,
          senderId,
          content: messageContent,
          type: MessageType.TASK,
          threadParentId: null,
        },
      });
    });

    return {
      spaceId: space.id,
      channelId: targetChannel.id,
      channelName: targetChannel.name,
      threadId: rootMessage.id,
      threadTitle: taskTitle,
    };
  }

  async createChannel(
    userId: string,
    spaceId: string,
    name: string,
    options: Pick<CreateChannelDto, 'visibility' | 'memberUserIds'> = {},
  ) {
    const isMember = await this.prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId,
          userId,
        },
      },
    });

    if (!isMember) {
      throw new BadRequestException('You are not a member of this space');
    }

    if (isMember.role === SpaceRole.MEMBER) {
      const setting = await this.settings.getSpaceSetting(spaceId);
      if (!setting.allowMemberCreateChannel) {
        throw new BadRequestException(
          SPACE_ERROR_MESSAGES.CHANNEL_CREATE_DISABLED,
        );
      }
    }

    if (!name || name.trim().length === 0) {
      throw new BadRequestException('Channel name cannot be empty');
    }

    const trimmedName = name.trim();
    const visibility = options.visibility ?? ChannelVisibility.PUBLIC;
    const memberUserIds =
      visibility === ChannelVisibility.PRIVATE
        ? [...new Set([userId, ...(options.memberUserIds ?? [])])]
        : [userId];

    // Check if channel already exists in this space (case-insensitive)
    const existingChannel = await this.prisma.channel.findFirst({
      where: {
        spaceId,
        name: {
          equals: trimmedName,
          mode: 'insensitive',
        },
        OR: [
          { visibility: ChannelVisibility.PUBLIC },
          { members: { some: { userId } } },
        ],
      },
    });

    if (existingChannel) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.CHANNEL_NAME_EXISTS);
    }

    const { channel: result, systemMessages } = await this.prisma.$transaction(
      async (tx) => {
        if (visibility === ChannelVisibility.PRIVATE) {
          const validCount = await tx.spaceMember.count({
            where: { spaceId, userId: { in: memberUserIds } },
          });
          if (validCount !== memberUserIds.length)
            throw new BadRequestException(
              SPACE_ERROR_MESSAGES.MEMBER_NOT_FOUND,
            );
        }
        const channel = await tx.channel.create({
          data: {
            spaceId,
            name: trimmedName,
            createdBy: userId,
            isDefault: false,
            visibility,
            ownerId: visibility === ChannelVisibility.PRIVATE ? userId : null,
          },
        });

        await tx.channelSetting.create({
          data: {
            channelId: channel.id,
            allowSendMessage: true,
            allowCreateNote: true,
            allowCreateTask: true,
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

        if (visibility === ChannelVisibility.PRIVATE) {
          await tx.channelMember.createMany({
            data: memberUserIds
              .filter((id) => id !== userId)
              .map((userId) => ({ channelId: channel.id, userId })),
            skipDuplicates: true,
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

        const spaceMembers = await tx.spaceMember.findMany({
          where: {
            spaceId,
            userId: { in: createdChannel.members.map((m) => m.userId) },
          },
        });

        const systemMessages =
          visibility === ChannelVisibility.PRIVATE
            ? await createPrivateChannelSystemMessages(
                tx,
                channel.id,
                userId,
                memberUserIds
                  .filter((id) => id !== userId)
                  .map((userId) => ({
                    userId,
                    action: PrivateChannelMembershipAction.ADDED,
                  })),
              )
            : [];
        return {
          systemMessages,
          channel: {
            ...createdChannel,
            members: createdChannel.members.map((member) => ({
              ...member,
              role:
                spaceMembers.find(
                  (spaceMember) => spaceMember.userId === member.userId,
                )?.role ?? SpaceRole.MEMBER,
            })),
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    const spaceMembers = await this.prisma.spaceMember.findMany({
      where: { spaceId },
      select: { userId: true },
    });

    this.chatSocketPublisher.publishToRooms(
      visibility === ChannelVisibility.PRIVATE
        ? memberUserIds
        : spaceMembers.map((m) => m.userId),
      ChatEvent.CHANNEL_SETTING_UPDATED,
      {
        eventType: 'channel_created',
        spaceId,
      },
    );

    if (visibility === ChannelVisibility.PRIVATE)
      await this.privateChannels.notifyAdded(
        result,
        userId,
        memberUserIds.filter((id) => id !== userId),
      );
    publishPrivateChannelSystemMessages(
      this.chatSocketPublisher,
      systemMessages,
      memberUserIds,
    );
    return result;
  }

  async getSpaceChannels(userId: string, spaceId: string, search?: string) {
    await this.access.assertSpaceMember(spaceId, userId);

    const whereClause: Prisma.ChannelWhereInput = {
      spaceId,
      OR: [
        { visibility: ChannelVisibility.PUBLIC },
        { members: { some: { userId } } },
      ],
    };
    if (search && search.trim().length > 0) {
      whereClause.name = {
        contains: search.trim(),
        mode: 'insensitive',
      };
    }

    const channels = await this.prisma.channel.findMany({
      where: whereClause,
      include: {
        setting: true,
        members: true,
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            medias: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const spaceMembers = await this.prisma.spaceMember.findMany({
      where: { spaceId },
      select: {
        userId: true,
        role: true,
      },
    });
    const roleByUserId = new Map(spaceMembers.map((m) => [m.userId, m.role]));

    return Promise.all(
      channels.map((channel) =>
        this.presentation.mapChannelForClient(channel, userId, roleByUserId),
      ),
    );
  }
}
