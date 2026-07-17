import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class NoteService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotesInConversation(conversationId: string) {
    return this.prisma.note.findMany({
      where: {
        message: {
          conversationId,
        }
      },
      orderBy: {
        createdAt: 'desc',
      }
    });
  }

  async updateNote(messageId: string, title: string, content: string, userId: string) {
    const note = await this.prisma.note.findUnique({
      where: { messageId }
    });

    if (!note) {
      throw new Error('Note not found');
    }

    if (note.createdBy !== userId) {
      throw new Error('Only the creator can edit this note');
    }

    await this.prisma.note.update({
      where: { messageId },
      data: {
        title,
        content,
      }
    });

    return this.prisma.message.update({
      where: { id: messageId },
      data: { createdAt: new Date() },
      include: {
        note: true,
        medias: true,
        reactions: true,
      }
    });
  }
}
