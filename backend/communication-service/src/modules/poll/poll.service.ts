import { Prisma } from '@prisma/client';
import {
  BadRequestException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { POLL_ERROR_CODES, POLL_ERROR_MESSAGES } from './types/poll.enums';
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
    selected?: boolean,
  ) {
    const message = await this.prisma.$transaction(async (tx) => {
      const poll = await this.lockPoll(tx, channelId, messageId, userId);
      if (poll.isLocked)
        throw new BadRequestException(POLL_ERROR_MESSAGES.LOCKED);
      const option = poll.options.find(
        (candidate) => candidate.id === pollOptionId,
      );
      if (!option)
        throw new BadRequestException(POLL_ERROR_MESSAGES.OPTION_NOT_FOUND);
      const shouldSelect =
        selected ?? !option.votes.some((vote) => vote.userId === userId);
      if (!shouldSelect)
        await tx.pollVote.deleteMany({ where: { pollOptionId, userId } });
      else {
        if (!poll.multipleChoice)
          await tx.pollVote.deleteMany({
            where: {
              userId,
              pollOptionId: {
                in: poll.options
                  .filter((candidate) => candidate.id !== pollOptionId)
                  .map((candidate) => candidate.id),
              },
            },
          });
        await tx.pollVote.upsert({
          where: { pollOptionId_userId: { pollOptionId, userId } },
          create: { pollOptionId, userId },
          update: {},
        });
      }
      return this.readUpdatedMessage(tx, messageId);
    });
    return this.enrichMessage(message);
  }

  async votePollAndPublish(
    channelId: string,
    messageId: string,
    pollOptionId: string,
    userId: string,
    selected?: boolean,
  ) {
    const updatedMessage = await this.votePoll(
      channelId,
      messageId,
      pollOptionId,
      userId,
      selected,
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
    if (!text.trim())
      throw new BadRequestException(POLL_ERROR_MESSAGES.EMPTY_OPTION);
    const message = await this.prisma.$transaction(async (tx) => {
      const poll = await this.lockPoll(tx, channelId, messageId, userId);
      if (poll.isLocked)
        throw new BadRequestException(POLL_ERROR_MESSAGES.LOCKED);
      if (!poll.allowAddOptions)
        throw new BadRequestException(POLL_ERROR_MESSAGES.ADD_OPTION_PREVENTED);
      const option = await tx.pollOption.create({
        data: { pollId: poll.id, text: text.trim(), createdBy: userId },
      });
      if (!poll.multipleChoice)
        await tx.pollVote.deleteMany({
          where: {
            userId,
            pollOptionId: { in: poll.options.map((candidate) => candidate.id) },
          },
        });
      await tx.pollVote.create({ data: { userId, pollOptionId: option.id } });
      return this.readUpdatedMessage(tx, messageId);
    });
    return this.enrichMessage(message);
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
    const message = await this.prisma.$transaction(async (tx) => {
      const poll = await this.lockPoll(tx, channelId, messageId, userId);
      if (poll.createdBy !== userId)
        throw new BadRequestException(POLL_ERROR_MESSAGES.EDIT_ACCESS_DENIED);
      if (!multipleChoice) {
        const voters = new Set<string>();
        for (const option of poll.options)
          for (const vote of option.votes) {
            if (voters.has(vote.userId))
              throw new BadRequestException({
                code: POLL_ERROR_CODES.MULTIPLE_VOTES_EXIST,
                message: POLL_ERROR_MESSAGES.MULTIPLE_VOTES_EXIST,
              });
            voters.add(vote.userId);
          }
      }
      await tx.poll.update({
        where: { id: poll.id },
        data: { title, multipleChoice, allowAddOptions, anonymous, isLocked },
      });
      return this.readUpdatedMessage(tx, messageId);
    });
    return this.enrichMessage(message);
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

  private async lockPoll(
    tx: Prisma.TransactionClient,
    channelId: string,
    messageId: string,
    userId: string,
  ) {
    await tx.$queryRaw`SELECT id FROM polls WHERE message_id = ${messageId}::uuid FOR UPDATE`;
    const poll = await tx.poll.findUnique({
      where: { messageId },
      include: {
        message: { select: { channelId: true } },
        options: { include: { votes: true } },
      },
    });
    if (!poll || poll.message.channelId !== channelId)
      throw new BadRequestException(POLL_ERROR_MESSAGES.NOT_FOUND);
    const member = await tx.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (!member)
      throw new BadRequestException(POLL_ERROR_MESSAGES.NOT_MEMBER_OF_CHANNEL);
    return poll;
  }
  private readUpdatedMessage(tx: Prisma.TransactionClient, messageId: string) {
    return tx.message.update({
      where: { id: messageId },
      data: { createdAt: new Date() },
      include: {
        poll: { include: { options: { include: { votes: true } } } },
        note: true,
        medias: true,
        reactions: true,
      },
    });
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
