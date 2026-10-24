import { Injectable } from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SocketEventEmitter } from '../socket/services/socket-event-emitter';
import { ChatEvent } from '../socket/chat/chat-socket.events';
import { CHAT_CONTEXT_TYPE } from '../../common/types/chat.enums';
import {
  TaskSyncEventDto,
  matchesTaskCard,
  taskCardSnapshot,
} from './task-sync.dto';

@Injectable()
export class TaskSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sockets: SocketEventEmitter,
  ) {}

  async apply(event: TaskSyncEventDto): Promise<void> {
    const messages = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${event.taskId}, 0))`;
      const existing = await tx.projectTaskSnapshot.findUnique({
        where: { taskId: event.taskId },
      });
      if (
        existing &&
        (existing.projectId !== event.projectId ||
          existing.version > BigInt(event.version))
      )
        return [];
      const payload = taskCardSnapshot(event);
      await tx.projectTaskSnapshot.upsert({
        where: { taskId: event.taskId },
        create: {
          taskId: event.taskId,
          projectId: event.projectId,
          version: BigInt(event.version),
          payload,
        },
        update: { version: BigInt(event.version), payload },
      });
      // Include TEXT cards from older producers. Never touch arbitrary discussion replies.
      const candidates = await tx.message.findMany({
        where: {
          channel: { space: { projectId: event.projectId } },
          deletedAt: null,
          recalled: false,
          type: { in: [MessageType.TEXT, MessageType.TASK] },
          OR: [
            { content: { contains: event.taskId } },
            { content: { contains: `[Task #${event.taskId.slice(0, 8)}]` } },
          ],
        },
      });
      const updated: typeof candidates = [];
      for (const message of candidates) {
        if (!matchesTaskCard(message.content, event.taskId)) continue;
        const content = JSON.stringify(payload);
        updated.push(
          message.content === content && message.type === MessageType.TASK
            ? message
            : await tx.message.update({
                where: { id: message.id },
                data: { content, type: MessageType.TASK },
              }),
        );
      }
      return updated;
    });
    for (const message of messages) {
      const members = await this.prisma.channelMember.findMany({
        where: { channelId: message.channelId },
        select: { userId: true },
      });
      // Only current members receive private task content, including on retries.
      this.sockets.emitToRooms(
        members.map((member) => member.userId),
        ChatEvent.MESSAGE_UPDATED,
        {
          id: message.id,
          channelId: message.channelId,
          chatId: message.channelId,
          chatType: CHAT_CONTEXT_TYPE.CHANNEL,
          content: message.content,
          type: message.type,
          updatedAt: message.updatedAt.toISOString(),
        },
      );
    }
  }
}
