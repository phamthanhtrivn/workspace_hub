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

  async attachSenderProfilesToMessages<T extends { senderId: string }>(
    messages: T[],
  ): Promise<Array<T & { senderProfile: UserProfileSnapshotResponse | null }>> {
    const profileByUserId = await this.getProfilesByUserIds(
      messages.map((message) => message.senderId),
    );

    return messages.map((message) => ({
      ...message,
      senderProfile: profileByUserId.get(message.senderId) ?? null,
    }));
  }

  async attachSenderProfileToMessage<T extends { senderId: string }>(
    message: T,
  ): Promise<T & { senderProfile: UserProfileSnapshotResponse | null }> {
    const [enrichedMessage] = await this.attachSenderProfilesToMessages([
      message,
    ]);
    return enrichedMessage;
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
