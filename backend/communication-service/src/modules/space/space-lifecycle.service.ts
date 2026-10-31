import {
  Injectable,
  BadRequestException,
  BadGatewayException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SpaceRole } from '@prisma/client';
import { KAFKA_EVENTS } from '../../common/constants/kafka.constants';
import { DefaultSpaceChannelNames } from './types/space.types';
import { ProjectNameClient } from './project-name.client';
import { CHAT_CONTEXT_TYPE } from '../../common/types/chat.enums';
import { ChatSocketPublisher } from '../socket/chat/chat-socket.publisher';
import {
  SPACE_ERROR_MESSAGES,
  SPACE_SOCKET_EVENT_TYPE,
} from './types/space.enums';
import { SpaceSettingsService } from './space-settings.service';
import { SpaceAccessService } from './space-access.service';
import { SpaceEventPublisher } from './space-event-publisher.service';
import { SpacePresentationService } from './space-presentation.service';

@Injectable()
export class SpaceLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectNames: ProjectNameClient,
    private readonly chatSocketPublisher: ChatSocketPublisher,
    private readonly settings: SpaceSettingsService,
    private readonly access: SpaceAccessService,
    private readonly events: SpaceEventPublisher,
    private readonly presentation: SpacePresentationService,
  ) {}
  async createSpace(userId: string, name: string) {
    if (!name || name.trim().length === 0) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.SPACE_NAME_EMPTY);
    }

    const trimmedName = name.trim();
    const existingSpace = await this.prisma.space.findFirst({
      where: {
        createdBy: userId,
        name: {
          equals: trimmedName,
          mode: 'insensitive',
        },
      },
    });

    if (existingSpace) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.SPACE_NAME_EXISTS);
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
          role: SpaceRole.ADMIN,
        },
      });

      await this.settings.createSpaceSettingIfAvailable(tx, space.id);

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
      }

      return space;
    });
  }

  async updateSpace(userId: string, spaceId: string, name: string) {
    const current = await this.access.assertSpaceOwner(spaceId, userId);
    if (!name || name.trim().length === 0) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.SPACE_NAME_EMPTY);
    }

    const trimmedName = name.trim();
    const updatedSpace = await this.prisma.space.update({
      where: { id: spaceId },
      data: { name: trimmedName },
    });

    if (current.projectId && current.name !== trimmedName) {
      try {
        await this.projectNames.renameProject(
          current.projectId,
          trimmedName,
          userId,
        );
      } catch {
        await this.prisma.space
          .update({
            where: { id: spaceId },
            data: { name: current.name },
          })
          .catch(() => undefined);
        throw new BadGatewayException('Unable to sync project name');
      }
    }

    await this.events.publishSpaceRenamed(spaceId, updatedSpace.name, userId);

    return updatedSpace;
  }

  async renameProjectSpaceFromProject(
    projectId: string,
    name: string,
    actorId: string,
  ) {
    if (!name || name.trim().length === 0) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.SPACE_NAME_EMPTY);
    }

    const trimmedName = name.trim();
    const space = await this.prisma.space.findFirst({
      where: { projectId },
      select: { id: true, name: true },
    });

    if (!space) {
      return { projectId, spaceId: null, name: trimmedName };
    }
    if (space.name === trimmedName) {
      return { projectId, spaceId: space.id, name: space.name };
    }

    const updatedSpace = await this.prisma.space.update({
      where: { id: space.id },
      data: { name: trimmedName },
    });

    await this.events.publishSpaceRenamed(
      updatedSpace.id,
      updatedSpace.name,
      actorId,
    );

    return { projectId, spaceId: updatedSpace.id, name: updatedSpace.name };
  }

  async deleteSpace(userId: string, spaceId: string) {
    await this.access.assertCanDeleteSpace(spaceId, userId);
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
      select: { name: true, projectId: true },
    });
    const channels = await this.prisma.channel.findMany({
      where: { spaceId },
      select: { id: true, name: true },
    });
    const members = await this.prisma.spaceMember.findMany({
      where: { spaceId },
      select: { userId: true },
    });
    const profileByUserId = await this.presentation.getProfileMap([userId]);
    const actorProfile = profileByUserId.get(userId) ?? null;
    const actorName = this.presentation.getProfileDisplayName(
      actorProfile,
      userId,
    );

    await this.prisma.space.delete({ where: { id: spaceId } });

    this.chatSocketPublisher.publishConversationDisbanded(
      [
        ...channels.map((channel) => channel.id),
        ...members.map((member) => member.userId),
      ],
      {
        eventType: SPACE_SOCKET_EVENT_TYPE.DISBANDED,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        spaceId,
        spaceName: space?.name ?? null,
        affectedUserIds: members.map((member) => member.userId),
        leftSpace: true,
        actorProfile,
      },
    );

    this.events.publishSpaceActionNotifications({
      recipientIds: members.map((member) => member.userId),
      actorId: userId,
      actorName,
      actorAvatar: actorProfile?.avatarUrl,
      type: KAFKA_EVENTS.NOTIFICATION.SPACE_DISBANDED,
      title: 'Space disbanded',
      content: `${space?.name ?? 'A space'} was disbanded by ${actorName ?? 'an admin'}`,
      metadata: {
        spaceId,
        spaceName: space?.name,
        actorId: userId,
        actorName,
      },
    });

    if (space?.projectId) {
      await this.projectNames
        .publishProjectSpaceEvent(space.projectId, {
          action: 'DELETED',
          actorId: userId,
          spaceId,
          channelId: null,
          exists: false,
        })
        .catch(() => undefined);
    }

    return { success: true };
  }
}
