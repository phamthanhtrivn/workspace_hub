import { authorizeProject } from '../../../common/auth/project-authorization';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CHANNEL_RESOURCE_KEY,
  ChannelResourceOptions,
} from './channel-resource.decorator';
import { ChannelAccessService } from './channel-access.service';
import { CHANNEL_ERROR_MESSAGES } from '../types/channel.enums';

@Injectable()
export class PrivateChannelGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly access: ChannelAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const resource =
      this.reflector.getAllAndOverride<ChannelResourceOptions | null>(
        CHANNEL_RESOURCE_KEY,
        [context.getHandler(), context.getClass()],
      );
    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.headers['x-user-id'];
    if (typeof userId === 'string' && typeof request.params.spaceId === 'string') {
      const space = await this.prisma.space.findUnique({ where: { id: request.params.spaceId }, select: { projectId: true } });
      if (space?.projectId) await authorizeProject(userId, space.projectId);
    }
    if (!resource) return true;
    const id = request.params[resource.parameter];
    if (typeof id !== 'string') return true;
    let channelId: string | null = id;
    if (resource.kind === 'message') {
      const message = await this.prisma.message.findUnique({
        where: { id },
        select: { channelId: true },
      });
      if (!message)
        throw new NotFoundException(
          CHANNEL_ERROR_MESSAGES.PRIVATE_ACCESS_DENIED,
        );
      channelId = message.channelId;
    }
    if (channelId) {
      const header = request.headers['x-user-id'];
      await this.access.assertPrivateAccess(
        channelId,
        typeof header === 'string' ? header : undefined,
      );
    }
    return true;
  }
}
