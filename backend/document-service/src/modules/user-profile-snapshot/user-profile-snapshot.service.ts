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

    const resultMap = new Map<string, UserProfileSnapshotResponse>();
    snapshots.forEach((snapshot) => {
      resultMap.set(snapshot.userId, {
        id: snapshot.userId,
        userId: snapshot.userId,
        email: snapshot.email,
        fullName: snapshot.fullName,
        avatarUrl: snapshot.avatarUrl,
      });
    });

    return resultMap;
  }

  async attachProfilesToDocumentItems<T extends { ownerUserId: string }>(
    items: T[],
  ): Promise<Array<T & { ownerProfile: UserProfileSnapshotResponse | null }>> {
    const profileByUserId = await this.getProfilesByUserIds(
      items.map((item) => item.ownerUserId),
    );

    return items.map((item) => ({
      ...item,
      ownerProfile: profileByUserId.get(item.ownerUserId) ?? null,
    }));
  }

  async attachProfilesToDocumentVersions<T extends { uploadedBy: string }>(
    versions: T[],
  ): Promise<Array<T & { uploaderProfile: UserProfileSnapshotResponse | null }>> {
    const profileByUserId = await this.getProfilesByUserIds(
      versions.map((version) => version.uploadedBy),
    );

    return versions.map((version) => ({
      ...version,
      uploaderProfile: profileByUserId.get(version.uploadedBy) ?? null,
    }));
  }

  async attachProfilesToDocumentShares<T extends { shareWithUserId?: string | null }>(
    shares: T[],
  ): Promise<Array<T & { shareWithProfile: UserProfileSnapshotResponse | null }>> {
    const userIds = shares
      .map((share) => share.shareWithUserId)
      .filter((userId): userId is string => Boolean(userId));

    const profileByUserId = await this.getProfilesByUserIds(userIds);

    return shares.map((share) => ({
      ...share,
      shareWithProfile: share.shareWithUserId
        ? profileByUserId.get(share.shareWithUserId) ?? null
        : null,
    }));
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
