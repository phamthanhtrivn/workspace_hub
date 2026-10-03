import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserDirectMessageSettingsClient } from './user-direct-message-settings.client';
import {
  DIRECT_MESSAGE_PERMISSION_MESSAGES,
  DIRECT_MESSAGE_PERMISSION_REASON,
} from './types/direct-message-permission.constants';

export interface DirectMessageSendPermission {
  canSend: boolean;
  reason: typeof DIRECT_MESSAGE_PERMISSION_REASON.RECIPIENT_BLOCKS_NEW_DM | null;
}

@Injectable()
export class DirectMessagePermissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userSettings: UserDirectMessageSettingsClient,
  ) {}

  async getSendPermission(
    conversationId: string,
    senderId: string,
  ): Promise<DirectMessageSendPermission> {
    const participants = await this.prisma.directConversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    if (participants.length === 0) {
      throw new NotFoundException('Direct conversation not found.');
    }
    if (!participants.some((participant) => participant.userId === senderId)) {
      throw new ForbiddenException(DIRECT_MESSAGE_PERMISSION_MESSAGES.NOT_PARTICIPANT);
    }

    const priorMessage = await this.prisma.directMessage.findFirst({
      where: { conversationId },
      select: { id: true },
    });
    if (priorMessage) return { canSend: true, reason: null };

    const recipient = participants.find((participant) => participant.userId !== senderId);
    if (!recipient) {
      throw new NotFoundException('Direct message recipient not found.');
    }
    const allowed = await this.userSettings.allowsNewDirectMessages(recipient.userId);
    return {
      canSend: allowed,
      reason: allowed ? null : DIRECT_MESSAGE_PERMISSION_REASON.RECIPIENT_BLOCKS_NEW_DM,
    };
  }

  async assertCanSend(conversationId: string, senderId: string): Promise<void> {
    const permission = await this.getSendPermission(conversationId, senderId);
    if (!permission.canSend) {
      throw new ForbiddenException(
        DIRECT_MESSAGE_PERMISSION_MESSAGES.RECIPIENT_BLOCKS_NEW_DM,
      );
    }
  }
}
