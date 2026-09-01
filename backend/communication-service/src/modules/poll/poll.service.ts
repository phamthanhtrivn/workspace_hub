import {
  BadRequestException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { POLL_ERROR_MESSAGES } from './types/poll.enums';
import { mapMediaWithUrl } from '../../common/utils/file.util';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import { ChatSocketPublisher } from '../socket/chat/chat-socket.publisher';

@Injectable()
export class PollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
    @Inject(forwardRef(() => ChatSocketPublisher))
    private readonly chatSocketPublisher: ChatSocketPublisher,
  ) {}

  async getPollsInConversation(channelId: string, userId: string, q?: string) {
    await this.assertChannelMember(channelId, userId);

    const polls = await this.prisma.poll.findMany({
      where: {
        message: {
          channelId,
        },
        ...(q && {
          title: {
            contains: q,
            mode: 'insensitive' as const,
          },
        }),
      },
      include: {
        options: { include: { votes: true } },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return this.userProfileSnapshotService.attachCreatorProfilesToPolls(polls);
  }

  async votePoll(
    channelId: string,
    messageId: string,
    pollOptionId: string,
    userId: string,
  ) {
    const poll = await this.prisma.poll.findUnique({
      where: { messageId },
      include: {
        message: { select: { channelId: true } },
        options: { include: { votes: true } },
      },
    });

    if (!poll) {
      throw new Error(POLL_ERROR_MESSAGES.NOT_FOUND);
    }
    await this.assertPollChannelMember(
      poll.message.channelId,
      channelId,
      userId,
    );
    if (poll.isLocked) {
      throw new BadRequestException(POLL_ERROR_MESSAGES.LOCKED);
    }

    const option = poll.options.find((opt) => opt.id === pollOptionId);
    if (!option) {
      throw new Error(POLL_ERROR_MESSAGES.OPTION_NOT_FOUND);
    }

    const hasVotedThisOption = option.votes.some((v) => v.userId === userId);

    if (hasVotedThisOption) {
      // Remove vote
      await this.prisma.pollVote.deleteMany({
        where: { pollOptionId, userId },
      });
    } else {
      if (!poll.multipleChoice) {
        // Remove votes from other options in this poll for this user
        const optionIds = poll.options.map((opt) => opt.id);
        await this.prisma.pollVote.deleteMany({
          where: { userId, pollOptionId: { in: optionIds } },
        });
      }

      // Add vote
      await this.prisma.pollVote.create({
        data: {
          userId,
          pollOptionId,
        },
      });
    }

    // Bump message to bottom and return it
    return this.prisma.message
      .update({
        where: { id: messageId },
        data: { createdAt: new Date() },
        include: {
          poll: { include: { options: { include: { votes: true } } } },
          note: true,
          medias: true,
          reactions: true,
        },
      })
      .then((message) => this.enrichMessage(message));
  }

  async votePollAndPublish(
    channelId: string,
    messageId: string,
    pollOptionId: string,
    userId: string,
  ) {
    const updatedMessage = await this.votePoll(
      channelId,
      messageId,
      pollOptionId,
      userId,
    );

    await this.chatSocketPublisher.publishMessageMoved(
      channelId,
      updatedMessage,
    );

    return updatedMessage;
  }

  async addPollOption(
    channelId: string,
    messageId: string,
    text: string,
    userId: string,
  ) {
    const poll = await this.prisma.poll.findUnique({
      where: { messageId },
      include: { message: { select: { channelId: true } } },
    });
    if (!poll) throw new Error(POLL_ERROR_MESSAGES.NOT_FOUND);
    await this.assertPollChannelMember(
      poll.message.channelId,
      channelId,
      userId,
    );
    if (poll.isLocked)
      throw new BadRequestException(POLL_ERROR_MESSAGES.LOCKED);
    if (!poll.allowAddOptions)
      throw new Error(POLL_ERROR_MESSAGES.ADD_OPTION_PREVENTED);

    const newOption = await this.prisma.pollOption.create({
      data: {
        pollId: poll.id,
        text,
        createdBy: userId,
      },
    });

    // Automatically vote for this newly created option
    return this.votePoll(channelId, messageId, newOption.id, userId);
  }

  async addPollOptionAndPublish(
    channelId: string,
    messageId: string,
    text: string,
    userId: string,
  ) {
    const updatedMessage = await this.addPollOption(
      channelId,
      messageId,
      text,
      userId,
    );

    await this.chatSocketPublisher.publishMessageMoved(
      channelId,
      updatedMessage,
    );

    return updatedMessage;
  }

  async updatePoll(
    channelId: string,
    messageId: string,
    title: string,
    multipleChoice: boolean,
    allowAddOptions: boolean,
    userId: string,
    anonymous?: boolean,
    isLocked?: boolean,
  ) {
    const poll = await this.prisma.poll.findUnique({
      where: { messageId },
      include: { message: { select: { channelId: true } } },
    });

    if (!poll) {
      throw new Error(POLL_ERROR_MESSAGES.NOT_FOUND);
    }
    await this.assertPollChannelMember(
      poll.message.channelId,
      channelId,
      userId,
    );
    if (poll.createdBy !== userId) {
      throw new BadRequestException(POLL_ERROR_MESSAGES.EDIT_ACCESS_DENIED);
    }

    await this.prisma.poll.update({
      where: { messageId },
      data: {
        title,
        multipleChoice,
        allowAddOptions,
        ...(anonymous !== undefined && { anonymous }),
        ...(isLocked !== undefined && { isLocked }),
      },
    });

    return this.prisma.message
      .update({
        where: { id: messageId },
        data: { createdAt: new Date() },
        include: {
          poll: { include: { options: { include: { votes: true } } } },
          note: true,
          medias: true,
          reactions: true,
        },
      })
      .then((message) => this.enrichMessage(message));
  }

  async updatePollAndPublish(
    channelId: string,
    messageId: string,
    title: string,
    multipleChoice: boolean,
    allowAddOptions: boolean,
    userId: string,
    anonymous?: boolean,
    isLocked?: boolean,
  ) {
    const updatedMessage = await this.updatePoll(
      channelId,
      messageId,
      title,
      multipleChoice,
      allowAddOptions,
      userId,
      anonymous,
      isLocked,
    );

    await this.chatSocketPublisher.publishMessageMoved(
      channelId,
      updatedMessage,
    );

    return updatedMessage;
  }

  private async assertPollChannelMember(
    actualChannelId: string,
    requestedChannelId: string,
    userId: string,
  ) {
    if (actualChannelId !== requestedChannelId) {
      throw new BadRequestException(POLL_ERROR_MESSAGES.NOT_MEMBER_OF_CHANNEL);
    }
    await this.assertChannelMember(actualChannelId, userId);
  }

  private async assertChannelMember(channelId: string, userId: string) {
    const member = await this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
      select: { userId: true },
    });

    if (!member) {
      throw new BadRequestException(POLL_ERROR_MESSAGES.NOT_MEMBER_OF_CHANNEL);
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
