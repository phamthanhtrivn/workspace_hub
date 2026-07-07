import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageType, Prisma } from '@prisma/client';

@Injectable()
export class MessageService {
  constructor(private readonly prisma: PrismaService) {}

  async createMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type: MessageType = MessageType.TEXT,
    medias?: {
      name: string;
      s3Key: string;
      mimeType: string;
      sizeBytes: number;
    }[],
  ): Promise<Prisma.MessageGetPayload<{ include: { medias: true } }>> {
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          conversationId,
          senderId,
          content,
          type,
          medias:
            medias && medias.length > 0
              ? {
                  create: medias.map((m) => {
                    let mediaType = 'FILE';
                    if (m.mimeType.startsWith('image/')) mediaType = 'IMAGE';
                    else if (m.mimeType.startsWith('video/')) mediaType = 'VIDEO';
                    
                    return {
                      name: m.name,
                      s3Key: m.s3Key,
                      mimeType: m.mimeType,
                      sizeBytes: m.sizeBytes,
                      type: mediaType as any,
                    };
                  }),
                }
              : undefined,
        },
        include: {
          medias: true,
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return message;
    });
  }

  async getConversationMemberIds(conversationId: string): Promise<string[]> {
    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }
}
