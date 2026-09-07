import {
  BadRequestException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NOTE_ERROR_MESSAGES } from './types/note.enums';
import { mapMediaWithUrl } from '../../common/utils/file.util';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import { ChatSocketPublisher } from '../socket/chat/chat-socket.publisher';

@Injectable()
export class NoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
    @Inject(forwardRef(() => ChatSocketPublisher))
    private readonly chatSocketPublisher: ChatSocketPublisher,
  ) {}

  async getNotesInConversation(channelId: string, userId: string, q?: string) {
    await this.assertChannelMember(channelId, userId);

    const notes = await this.prisma.note.findMany({
      where: {
        message: {
          channelId,
        },
        ...(q && {
          OR: [
            {
              title: {
                contains: q,
                mode: 'insensitive' as const,
              },
            },
            {
              content: {
                contains: q,
                mode: 'insensitive' as const,
              },
            },
          ],
        }),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return this.userProfileSnapshotService.attachCreatorProfilesToNotes(notes);
  }

  async updateNote(
    channelId: string,
    messageId: string,
    title: string,
    content: string,
    userId: string,
  ) {
    const note = await this.prisma.note.findUnique({
      where: { messageId },
      include: { message: { select: { channelId: true } } },
    });

    if (!note) {
      throw new Error(NOTE_ERROR_MESSAGES.NOT_FOUND);
    }
    await this.assertNoteChannelMember(
      note.message.channelId,
      channelId,
      userId,
    );

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

    return this.prisma.message
      .update({
        where: { id: messageId },
        data: { createdAt: new Date() },
        include: {
          note: true,
          poll: { include: { options: { include: { votes: true } } } },
          medias: true,
          reactions: true,
        },
      })
      .then((message) => this.enrichMessage(message));
  }

  async updateNoteAndPublish(
    channelId: string,
    messageId: string,
    title: string,
    content: string,
    userId: string,
  ) {
    const updatedMessage = await this.updateNote(
      channelId,
      messageId,
      title,
      content,
      userId,
    );

    await this.chatSocketPublisher.publishMessageMoved(
      channelId,
      updatedMessage,
    );

    return updatedMessage;
  }

  private async assertNoteChannelMember(
    actualChannelId: string,
    requestedChannelId: string,
    userId: string,
  ) {
    if (actualChannelId !== requestedChannelId) {
      throw new BadRequestException(NOTE_ERROR_MESSAGES.NOT_MEMBER_OF_CHANNEL);
    }
    await this.assertChannelMember(actualChannelId, userId);
  }

  private async assertChannelMember(channelId: string, userId: string) {
    const member = await this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
      select: { userId: true },
    });

    if (!member) {
      throw new BadRequestException(NOTE_ERROR_MESSAGES.NOT_MEMBER_OF_CHANNEL);
    }
  }

  private async enrichMessage<
    T extends { senderId: string; medias?: unknown[] },
  >(message: T) {
    return this.userProfileSnapshotService.attachSenderProfileToMessage({
      ...message,
      medias: mapMediaWithUrl((message.medias ?? []) as any),
    });
  }
}
