import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NOTE_ERROR_MESSAGES } from './types/note.enums';

@Injectable()
export class NoteService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotesInConversation(channelId: string) {
    return this.prisma.note.findMany({
      where: {
        message: {
          channelId,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateNote(
    messageId: string,
    title: string,
    content: string,
    userId: string,
  ) {
    const note = await this.prisma.note.findUnique({
      where: { messageId },
    });

    if (!note) {
      throw new Error(NOTE_ERROR_MESSAGES.NOT_FOUND);
    }

    if (note.createdBy !== userId) {
      throw new Error(NOTE_ERROR_MESSAGES.EDIT_ACCESS_DENIED);
    }

    await this.prisma.note.update({
      where: { messageId },
      data: {
        title,
        content,
      },
    });

    return this.prisma.message.update({
      where: { id: messageId },
      data: { createdAt: new Date() },
      include: {
        note: true,
        medias: true,
        reactions: true,
      },
    });
  }
}
