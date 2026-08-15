import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  UserProfileSnapshotPayload,
  UserProfileSnapshotResponse,
} from './types/user-profile-snapshot.types';
import {
  UserProfileSnapshotErrorMessage,
  UserProfileSnapshotEventType,
} from './types/user-profile-snapshot.enums';

@Injectable()
export class UserProfileSnapshotService {
  private readonly logger = new Logger(UserProfileSnapshotService.name);

  constructor(private readonly prisma: PrismaService) {}

  async upsertFromEvent(payload: UserProfileSnapshotPayload) {
    this.assertValidPayload(payload);

    const occurredAt = payload.occurredAt
      ? new Date(payload.occurredAt)
      : new Date();

    const existingSnapshot = await this.prisma.userProfileSnapshot.findUnique({
      where: { userId: payload.userId },
      select: { syncedAt: true },
    });

    if (existingSnapshot && occurredAt < existingSnapshot.syncedAt) {
      this.logger.debug(
        `Ignored stale user profile snapshot event for ${payload.userId}`,
      );
      return existingSnapshot;
    }

    if (
      payload.eventType === UserProfileSnapshotEventType.REMOVED ||
      payload.eventType === UserProfileSnapshotEventType.DISABLED
    ) {
      return this.prisma.userProfileSnapshot.deleteMany({
        where: { userId: payload.userId },
      });
    }

    return this.prisma.userProfileSnapshot.upsert({
      where: { userId: payload.userId },
      create: {
        userId: payload.userId,
        email: payload.email ?? null,
        fullName: payload.fullName ?? null,
        avatarUrl: payload.avatarUrl ?? null,
        syncedAt: occurredAt,
      },
      update: {
        email: payload.email ?? null,
        fullName: payload.fullName ?? null,
        avatarUrl: payload.avatarUrl ?? null,
        syncedAt: occurredAt,
      },
    });
  }

  async getProfilesByUserIds(
    userIds: string[],
  ): Promise<Map<string, UserProfileSnapshotResponse>> {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueUserIds.length === 0) {
      return new Map();
    }

    const snapshots = await this.prisma.userProfileSnapshot.findMany({
      where: { userId: { in: uniqueUserIds } },
      select: {
        userId: true,
        email: true,
        fullName: true,
        avatarUrl: true,
      },
    });

    return new Map(
      snapshots.map((snapshot) => [
        snapshot.userId,
        {
          id: snapshot.userId,
          userId: snapshot.userId,
          email: snapshot.email,
          fullName: snapshot.fullName,
          avatarUrl: snapshot.avatarUrl,
        },
      ]),
    );
  }

  async attachProfilesToMembers<T extends { userId: string }>(
    members: T[],
  ): Promise<Array<T & { profile: UserProfileSnapshotResponse | null }>> {
    const profileByUserId = await this.getProfilesByUserIds(
      members.map((member) => member.userId),
    );

    return members.map((member) => ({
      ...member,
      profile: profileByUserId.get(member.userId) ?? null,
    }));
  }

  async attachCreatorProfilesToPolls<T extends { createdBy: string }>(
    polls: T[],
  ): Promise<Array<T & { creatorProfile: UserProfileSnapshotResponse | null }>> {
    const profileByUserId = await this.getProfilesByUserIds([
      ...polls.map((poll) => poll.createdBy),
      ...this.getPollVoteUserIds(polls),
    ]);

    return polls.map((poll) => ({
      ...poll,
      creatorProfile: profileByUserId.get(poll.createdBy) ?? null,
      ...this.enrichPollVotes(poll, profileByUserId),
    }));
  }

  async attachCreatorProfilesToNotes<T extends { createdBy: string }>(
    notes: T[],
  ): Promise<Array<T & { creatorProfile: UserProfileSnapshotResponse | null }>> {
    const profileByUserId = await this.getProfilesByUserIds(
      notes.map((note) => note.createdBy),
    );

    return notes.map((note) => ({
      ...note,
      creatorProfile: profileByUserId.get(note.createdBy) ?? null,
    }));
  }

  async attachSenderProfilesToMessages<
    T extends {
      senderId: string;
      poll?: ({ createdBy: string } & Record<string, unknown>) | null;
      note?: ({ createdBy: string } & Record<string, unknown>) | null;
    },
  >(
    messages: T[],
  ): Promise<Array<T & { senderProfile: UserProfileSnapshotResponse | null }>> {
    const profileByUserId = await this.getProfilesByUserIds([
      ...messages.map((message) => message.senderId),
      ...messages.flatMap((message) => [
        message.poll?.createdBy,
        message.note?.createdBy,
      ]),
      ...this.getPollVoteUserIds(
        messages
          .map((message) => message.poll)
          .filter((poll): poll is NonNullable<T['poll']> => Boolean(poll)),
      ),
    ].filter((userId): userId is string => Boolean(userId)));

    return messages.map((message) => ({
      ...message,
      senderProfile: profileByUserId.get(message.senderId) ?? null,
      poll: message.poll
        ? {
            ...message.poll,
            creatorProfile: profileByUserId.get(message.poll.createdBy) ?? null,
            ...this.enrichPollVotes(message.poll, profileByUserId),
          }
        : message.poll,
      note: message.note
        ? {
            ...message.note,
            creatorProfile: profileByUserId.get(message.note.createdBy) ?? null,
          }
        : message.note,
    }));
  }

  async attachSenderProfileToMessage<
    T extends {
      senderId: string;
      poll?: ({ createdBy: string } & Record<string, unknown>) | null;
      note?: ({ createdBy: string } & Record<string, unknown>) | null;
    },
  >(
    message: T,
  ): Promise<T & { senderProfile: UserProfileSnapshotResponse | null }> {
    const [enrichedMessage] = await this.attachSenderProfilesToMessages([
      message,
    ]);
    return enrichedMessage;
  }

  private getPollVoteUserIds(polls: unknown[]): string[] {
    return polls.flatMap((poll) =>
      this.getPollOptions(poll).flatMap((option) =>
        this.getPollVotes(option)
          .map((vote) => vote.userId)
          .filter((userId): userId is string => Boolean(userId)),
      ),
    );
  }

  private enrichPollVotes(
    poll: unknown,
    profileByUserId: Map<string, UserProfileSnapshotResponse>,
  ): { options?: Array<Record<string, unknown>> } {
    const options = this.getPollOptions(poll);
    if (options.length === 0) {
      return {};
    }

    return {
      options: options.map((option) => ({
        ...option,
        votes: this.getPollVotes(option).map((vote) => ({
          ...vote,
          voterProfile: vote.userId
            ? profileByUserId.get(vote.userId) ?? null
            : null,
        })),
      })),
    };
  }

  private getPollOptions(poll: unknown): Array<Record<string, unknown>> {
    if (!poll || typeof poll !== 'object') {
      return [];
    }

    const options = (poll as { options?: unknown }).options;
    return Array.isArray(options)
      ? options.filter(
          (option): option is Record<string, unknown> =>
            Boolean(option) && typeof option === 'object',
        )
      : [];
  }

  private getPollVotes(
    option: Record<string, unknown>,
  ): Array<{ userId?: string | null } & Record<string, unknown>> {
    return Array.isArray(option.votes)
      ? option.votes.filter(
          (vote): vote is { userId?: string | null } & Record<string, unknown> =>
            Boolean(vote) && typeof vote === 'object',
        )
      : [];
  }

  private assertValidPayload(payload: UserProfileSnapshotPayload) {
    if (
      !payload ||
      !Object.values(UserProfileSnapshotEventType).includes(payload.eventType)
    ) {
      throw new Error(UserProfileSnapshotErrorMessage.INVALID_EVENT);
    }

    if (!payload.userId) {
      throw new Error(UserProfileSnapshotErrorMessage.MISSING_USER_ID);
    }
  }
}
