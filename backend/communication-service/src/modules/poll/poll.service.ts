import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PollService {
  constructor(private readonly prisma: PrismaService) {}

  async getPollsInConversation(conversationId: string) {
    return this.prisma.poll.findMany({
      where: {
        message: {
          conversationId,
        }
      },
      include: {
        options: { include: { votes: true } },
      },
      orderBy: {
        createdAt: 'desc',
      }
    });
  }

  async votePoll(messageId: string, pollOptionId: string, userId: string) {
    const poll = await this.prisma.poll.findUnique({
      where: { messageId },
      include: { options: { include: { votes: true } } },
    });

    if (!poll) {
      throw new Error('Poll not found');
    }

    const option = poll.options.find((opt) => opt.id === pollOptionId);
    if (!option) {
      throw new Error('Poll option not found');
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
    return this.prisma.message.update({
      where: { id: messageId },
      data: { createdAt: new Date() },
      include: {
        poll: { include: { options: { include: { votes: true } } } },
        medias: true,
        reactions: true,
        readReceipts: true,
      },
    });
  }

  async addPollOption(messageId: string, text: string, userId: string) {
    const poll = await this.prisma.poll.findUnique({
      where: { messageId },
    });
    if (!poll) throw new Error('Poll not found');
    if (!poll.allowAddOptions) throw new Error('Adding options is not allowed');

    const newOption = await this.prisma.pollOption.create({
      data: {
        pollId: poll.id,
        text,
        createdBy: userId,
      },
    });

    // Automatically vote for this newly created option
    await this.votePoll(messageId, newOption.id, userId);

    return this.prisma.message.update({
      where: { id: messageId },
      data: { createdAt: new Date() },
      include: {
        poll: { include: { options: { include: { votes: true } } } },
        medias: true,
        reactions: true,
        readReceipts: true,
      },
    });
  }

  async updatePoll(
    messageId: string,
    title: string,
    multipleChoice: boolean,
    allowAddOptions: boolean,
    anonymous?: boolean,
    isLocked?: boolean,
  ) {
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

    return this.prisma.message.update({
      where: { id: messageId },
      data: { createdAt: new Date() },
      include: {
        poll: { include: { options: { include: { votes: true } } } },
        medias: true,
        reactions: true,
        readReceipts: true,
      },
    });
  }
}
