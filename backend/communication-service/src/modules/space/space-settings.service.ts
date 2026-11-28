import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { UpdateSpaceSettingDto } from './dto/update-space-setting.dto';
import { CHAT_CONTEXT_TYPE } from '../../common/types/chat.enums';
import { ChatEvent } from '../socket/chat/chat-socket.events';
import { ChatSocketPublisher } from '../socket/chat/chat-socket.publisher';
import {
  SPACE_ERROR_MESSAGES,
  SPACE_SOCKET_EVENT_TYPE,
} from './types/space.enums';
import { SpaceAccessService } from './space-access.service';

@Injectable()
export class SpaceSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatSocketPublisher: ChatSocketPublisher,
    private readonly access: SpaceAccessService,
  ) {}
  getDefaultSpaceSetting(spaceId: string) {
    return {
      id: null,
      spaceId,
      allowMemberCreateChannel: true,
      allowMemberDeleteOwnChannel: false,
    };
  }

  isMissingSpaceSettingTableError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      (('code' in error && error.code === 'P2021') ||
        ('message' in error &&
          typeof error.message === 'string' &&
          error.message.includes('space_settings')))
    );
  }

  async getSpaceSetting(spaceId: string) {
    try {
      const setting = await this.prisma.spaceSetting.findUnique({
        where: { spaceId },
      });
      return setting ?? this.getDefaultSpaceSetting(spaceId);
    } catch (error) {
      if (this.isMissingSpaceSettingTableError(error)) {
        return this.getDefaultSpaceSetting(spaceId);
      }
      throw error;
    }
  }

  async createSpaceSettingIfAvailable(
    tx: Prisma.TransactionClient,
    spaceId: string,
  ) {
    try {
      await tx.spaceSetting.create({
        data: {
          spaceId,
          allowMemberCreateChannel: true,
          allowMemberDeleteOwnChannel: false,
        },
      });
    } catch (error) {
      if (!this.isMissingSpaceSettingTableError(error)) {
        throw error;
      }
    }
  }

  async updateSpaceSettings(
    userId: string,
    spaceId: string,
    settings: UpdateSpaceSettingDto,
  ) {
    await this.access.assertCanManageSpaceSettings(spaceId, userId);
    try {
      const updatedSetting = await this.prisma.spaceSetting.upsert({
        where: { spaceId },
        create: {
          spaceId,
          allowMemberCreateChannel: settings.allowMemberCreateChannel ?? true,
          allowMemberDeleteOwnChannel:
            settings.allowMemberDeleteOwnChannel ?? false,
        },
        update: {
          allowMemberCreateChannel: settings.allowMemberCreateChannel,
          allowMemberDeleteOwnChannel: settings.allowMemberDeleteOwnChannel,
        },
      });
      const channels = await this.prisma.channel.findMany({
        where: { spaceId },
        select: { id: true },
      });
      const members = await this.prisma.spaceMember.findMany({
        where: { spaceId },
        select: { userId: true },
      });
      const space = await this.prisma.space.findUnique({
        where: { id: spaceId },
        select: { name: true },
      });
      this.chatSocketPublisher.publishToRooms(
        [
          ...channels.map((channel) => channel.id),
          ...members.map((member) => member.userId),
        ],
        ChatEvent.CHANNEL_SETTING_UPDATED,
        {
          eventType: SPACE_SOCKET_EVENT_TYPE.SETTING_UPDATED,
          chatType: CHAT_CONTEXT_TYPE.CHANNEL,
          spaceId,
          spaceName: space?.name ?? null,
          affectedUserIds: members.map((member) => member.userId),
          setting: updatedSetting,
        },
      );
      return updatedSetting;
    } catch (error) {
      if (this.isMissingSpaceSettingTableError(error)) {
        throw new BadRequestException(
          SPACE_ERROR_MESSAGES.SETTINGS_UNAVAILABLE,
        );
      }
      throw error;
    }
  }
}
