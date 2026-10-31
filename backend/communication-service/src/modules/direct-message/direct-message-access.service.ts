import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MESSAGE_ERROR_MESSAGES } from '../message/types/message.enums';
import { DirectMessagePermissionService } from './direct-message-permission.service';

@Injectable()
export class DirectMessageAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly directMessagePermissionService: DirectMessagePermissionService,
  ) {}
  async assertDirectMessageMember(messageId: string, userId: string) {
    const message = await this.prisma.directMessage.findUnique({
      where: { id: messageId },
    });
    if (!message) {
      throw new NotFoundException(MESSAGE_ERROR_MESSAGES.MESSAGE_NOT_FOUND);
    }

    await this.directMessagePermissionService.assertCanRead(
      message.conversationId,
      userId,
    );
    return message;
  }

  async getOwnedDirectMessage(
    messageId: string,
    userId: string,
  ): Promise<Prisma.DirectMessageGetPayload<Record<string, never>>>;
  async getOwnedDirectMessage<TInclude extends Prisma.DirectMessageInclude>(
    messageId: string,
    userId: string,
    include: TInclude,
  ): Promise<Prisma.DirectMessageGetPayload<{ include: TInclude }>>;
  async getOwnedDirectMessage(
    messageId: string,
    userId: string,
    include?: Prisma.DirectMessageInclude,
  ) {
    const message = await this.prisma.directMessage.findUnique({
      where: { id: messageId },
      include,
    });
    if (!message) {
      throw new NotFoundException(MESSAGE_ERROR_MESSAGES.MESSAGE_NOT_FOUND);
    }
    if (message.senderId !== userId) {
      throw new ForbiddenException(
        MESSAGE_ERROR_MESSAGES.MODIFY_OWNER_REQUIRED,
      );
    }
    return message;
  }

  assertWithin24Hours(createdAt: Date, errorMessage: string) {
    const hoursDifference =
      (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    if (hoursDifference > 24) {
      throw new BadRequestException(errorMessage);
    }
  }
}
